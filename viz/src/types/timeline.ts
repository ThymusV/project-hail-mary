/**
 * Timeline types — re-exported from the canonical Zod schemas.
 *
 * Import from here when you only need the types (no runtime validation).
 * Import from '@/schema/timeline.schema' when you need the Zod schemas
 * themselves (e.g. for parsing incoming data).
 */

export type {
  SceneId,
  TimelineEvent,
  Segment,
  Scene,
  CameraKeyframe,
  CameraShot,
  TimelineData,
} from '@/schema/timeline.schema';

export {
  SCENE_IDS,
  SceneIdSchema,
  TimelineEventSchema,
  SegmentSchema,
  SceneSchema,
  CameraKeyframeSchema,
  CameraShotSchema,
  TimelineDataSchema,
  validateTimeline,
} from '@/schema/timeline.schema';
