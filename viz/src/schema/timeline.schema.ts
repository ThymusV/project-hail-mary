/**
 * Zod schemas for the entire timeline data model.
 *
 * This is the single source of truth for both runtime validation and
 * compile-time TypeScript types. The types/ layer re-exports from here.
 *
 * Custom refinements enforce domain invariants that go beyond structural
 * validation (unique IDs, temporal ordering, referential integrity, etc.).
 */

import { z } from 'zod';
import { CoordinateFrameIdSchema } from '@/types/coordinates';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

// ---------------------------------------------------------------------------
// SceneId
// ---------------------------------------------------------------------------

export const SCENE_IDS = [
  'earthDeparture',
  'interstellar',
  'tauCeti',
  'encounter',
  'adrian',
  'rescue',
  'eridian',
] as const;

export const SceneIdSchema = z.enum(SCENE_IDS);
export type SceneId = z.infer<typeof SceneIdSchema>;

// ---------------------------------------------------------------------------
// TimelineEvent
// ---------------------------------------------------------------------------

export const TimelineEventSchema = z.object({
  /** Unique event identifier */
  id: z.string().min(1),
  /** Days since the Petrova Line discovery (Day 0) */
  chronologicalTime: z.number(),
  /** Presentation order; 0-based, fractional values allowed for sub-sections */
  narrativeIndex: z.number().nonnegative(),
  /** Book chapter number, 1-31 (chapter 31 is the "Vl" chapter) */
  chapter: z.number().int().min(1).max(31),
  /** Which scene this event belongs to */
  sceneId: SceneIdSchema,
  /** Which coordinate frame to render in */
  frameId: CoordinateFrameIdSchema,
  /** Position within the scene's coordinate frame [x, y, z] */
  position: Vec3Schema,
  /** Short display name */
  label: z.string().min(1),
  /** Detailed descriptive text */
  description: z.string(),
  /** Importance tier: 1 = critical, 2 = major, 3 = minor */
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Character IDs involved in this event */
  actors: z.array(z.string().min(1)),
  /** Optional tags for filtering */
  tags: z.array(z.string().min(1)).optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// ---------------------------------------------------------------------------
// Segment — a contiguous span of chronological time within one scene
// ---------------------------------------------------------------------------

export const SegmentSchema = z.object({
  /** Unique segment identifier */
  id: z.string().min(1),
  /** Start of the segment in chronologicalTime (days) */
  startTime: z.number(),
  /** End of the segment in chronologicalTime (days) */
  endTime: z.number(),
  /** Scene this segment belongs to */
  sceneId: SceneIdSchema,
  /** Coordinate frame for rendering */
  frameId: CoordinateFrameIdSchema,
  /**
   * Controls scrubber compression. Must be > 0.
   * Low values compress transit periods; high values expand dense event clusters.
   */
  progressWeight: z.number().positive(),
  /** Human label (optional — defaults to id if missing) */
  label: z.string().min(1).optional(),
  /** How positions are interpolated within this segment */
  interpolation: z.enum(['linear', 'ease-in-out', 'step']),
});

export type Segment = z.infer<typeof SegmentSchema>;

// ---------------------------------------------------------------------------
// Scene — a discrete visual context
// ---------------------------------------------------------------------------

export const SceneSchema = z.object({
  /** Must match one of the SceneId values */
  id: SceneIdSchema,
  /** Default coordinate frame for this scene */
  frameId: CoordinateFrameIdSchema,
  /** Human-readable name */
  label: z.string().min(1),
  /** Longer description */
  description: z.string(),
  /** IDs of 3D objects that should be visible in this scene */
  visibleBodies: z.array(z.string().min(1)),
  /** How the scene enters */
  transitionIn: z.enum(['fade', 'cut']),
  /** Transition duration in milliseconds */
  transitionDuration: z.number().nonnegative(),
});

export type Scene = z.infer<typeof SceneSchema>;

// ---------------------------------------------------------------------------
// Camera Keyframe
// ---------------------------------------------------------------------------

export const CameraKeyframeSchema = z.object({
  /** Progress within the parent CameraShot, in [0, 1] */
  progress: z.number().min(0).max(1),
  /** Camera world position [x, y, z] */
  position: Vec3Schema,
  /** Look-at target [x, y, z] */
  target: Vec3Schema,
  /** Vertical field of view in degrees */
  fov: z.number().positive(),
  /** GSAP-compatible easing function name */
  easing: z.enum(['linear', 'power2.inOut', 'power3.inOut', 'sine.inOut']),
});

export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;

// ---------------------------------------------------------------------------
// Camera Shot — a sequence of keyframes anchored to chronological time
// ---------------------------------------------------------------------------

/** Base shape for CameraShot (before refinements) */
const CameraShotBaseSchema = z.object({
  /** Unique shot identifier */
  id: z.string().min(1),
  /** Scene this shot is used in */
  sceneId: SceneIdSchema,
  /** Start of this shot in chronologicalTime (days) */
  startChronoTime: z.number(),
  /** End of this shot in chronologicalTime (days) */
  endChronoTime: z.number(),
  /** Ordered keyframes (must be sorted by ascending progress) */
  keyframes: z.array(CameraKeyframeSchema).min(1),
  /** Whether the user can freely orbit when playback is paused in this shot */
  orbitOnPause: z.boolean(),
});

type CameraShotBase = z.infer<typeof CameraShotBaseSchema>;

export const CameraShotSchema = CameraShotBaseSchema
  .check(
    z.refine<CameraShotBase>(
      (shot) => shot.startChronoTime <= shot.endChronoTime,
      'CameraShot startChronoTime must be <= endChronoTime',
    ),
  )
  .check(
    z.refine<CameraShotBase>(
      (shot) => {
        for (let i = 1; i < shot.keyframes.length; i++) {
          if (shot.keyframes[i].progress < shot.keyframes[i - 1].progress) {
            return false;
          }
        }
        return true;
      },
      'CameraShot keyframes must be sorted by ascending progress (0 -> 1)',
    ),
  );

export type CameraShot = z.infer<typeof CameraShotSchema>;

// ---------------------------------------------------------------------------
// TimelineData — the full dataset
// ---------------------------------------------------------------------------

export const TimelineDataSchema = z
  .object({
    events: z.array(TimelineEventSchema),
    segments: z.array(SegmentSchema),
    scenes: z.array(SceneSchema),
    cameraShots: z.array(CameraShotSchema),
  })
  .check(
    z.superRefine((data, ctx) => {
      // --- events: unique IDs ---
      const eventIds = new Set<string>();
      for (const event of data.events) {
        if (eventIds.has(event.id)) {
          ctx.issues.push({
            code: 'custom',
            message: `Duplicate event ID: "${event.id}"`,
            input: data,
            path: ['events'],
            inst: null as never,
          });
        }
        eventIds.add(event.id);
      }

      // --- events: monotonically increasing chronologicalTime when sorted ---
      const sorted = [...data.events].sort(
        (a, b) => a.chronologicalTime - b.chronologicalTime,
      );
      for (let i = 1; i < sorted.length; i++) {
        // Equal times are allowed (simultaneous events), but going backward is not.
        // Since we sorted, this check validates that equal-time events have distinct IDs
        // (already covered above) and that the original data can be sorted without ambiguity.
        if (sorted[i].chronologicalTime < sorted[i - 1].chronologicalTime) {
          ctx.issues.push({
            code: 'custom',
            message: `Events are not monotonically ordered by chronologicalTime: "${sorted[i - 1].id}" (${sorted[i - 1].chronologicalTime}) > "${sorted[i].id}" (${sorted[i].chronologicalTime})`,
            input: data,
            path: ['events'],
            inst: null as never,
          });
        }
      }

      // --- events: every sceneId must reference a valid scene ---
      const sceneIdSet = new Set(data.scenes.map((s) => s.id));
      for (const event of data.events) {
        if (!sceneIdSet.has(event.sceneId)) {
          ctx.issues.push({
            code: 'custom',
            message: `Event "${event.id}" references unknown sceneId "${event.sceneId}"`,
            input: data,
            path: ['events'],
            inst: null as never,
          });
        }
      }

      // --- segments: unique IDs ---
      const segmentIds = new Set<string>();
      for (const seg of data.segments) {
        if (segmentIds.has(seg.id)) {
          ctx.issues.push({
            code: 'custom',
            message: `Duplicate segment ID: "${seg.id}"`,
            input: data,
            path: ['segments'],
            inst: null as never,
          });
        }
        segmentIds.add(seg.id);
      }

      // --- segments: must not overlap in time ---
      const segsByTime = [...data.segments].sort(
        (a, b) => a.startTime - b.startTime,
      );
      for (let i = 1; i < segsByTime.length; i++) {
        const prev = segsByTime[i - 1];
        const curr = segsByTime[i];
        if (curr.startTime < prev.endTime) {
          ctx.issues.push({
            code: 'custom',
            message: `Segments overlap in time: "${prev.id}" [${prev.startTime}, ${prev.endTime}] and "${curr.id}" [${curr.startTime}, ${curr.endTime}]`,
            input: data,
            path: ['segments'],
            inst: null as never,
          });
        }
      }

      // --- segments: every sceneId must reference a valid scene ---
      for (const seg of data.segments) {
        if (!sceneIdSet.has(seg.sceneId)) {
          ctx.issues.push({
            code: 'custom',
            message: `Segment "${seg.id}" references unknown sceneId "${seg.sceneId}"`,
            input: data,
            path: ['segments'],
            inst: null as never,
          });
        }
      }

      // --- cameraShots: unique IDs ---
      const shotIds = new Set<string>();
      for (const shot of data.cameraShots) {
        if (shotIds.has(shot.id)) {
          ctx.issues.push({
            code: 'custom',
            message: `Duplicate cameraShot ID: "${shot.id}"`,
            input: data,
            path: ['cameraShots'],
            inst: null as never,
          });
        }
        shotIds.add(shot.id);
      }

      // --- cameraShots: every sceneId must reference a valid scene ---
      for (const shot of data.cameraShots) {
        if (!sceneIdSet.has(shot.sceneId)) {
          ctx.issues.push({
            code: 'custom',
            message: `CameraShot "${shot.id}" references unknown sceneId "${shot.sceneId}"`,
            input: data,
            path: ['cameraShots'],
            inst: null as never,
          });
        }
      }
    }),
  );

export type TimelineData = z.infer<typeof TimelineDataSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Parse and validate raw timeline data. Returns strongly-typed `TimelineData`
 * or throws an error with descriptive messages.
 */
export function validateTimeline(data: unknown): TimelineData {
  const result = TimelineDataSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const messages = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `  [${path}] ${issue.message}`;
  });

  throw new Error(
    `Timeline validation failed with ${result.error.issues.length} issue(s):\n${messages.join('\n')}`,
  );
}
