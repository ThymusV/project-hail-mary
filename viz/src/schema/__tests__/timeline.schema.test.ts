import { describe, it, expect } from 'vitest';
import { validateTimeline, TimelineDataSchema } from '@/schema/timeline.schema';
import type { TimelineData } from '@/schema/timeline.schema';
import { FRAME_CONFIGS, CoordinateFrameConfigSchema } from '@/types/coordinates';
import { CameraStateSchema, CameraModeSchema } from '@/types/camera';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid dataset factory — all 7 scenes present */
function makeValid(): TimelineData {
  return {
    events: [
      {
        id: 'e1',
        chronologicalTime: 0,
        narrativeIndex: 0,
        chapter: 1,
        sceneId: 'earthDeparture',
        frameId: 'system',
        position: [0, 0, 0],
        label: 'Petrova Line Discovery',
        description: 'Day 0',
        importance: 1,
        actors: ['grace'],
      },
      {
        id: 'e2',
        chronologicalTime: 100,
        narrativeIndex: 1,
        chapter: 5,
        sceneId: 'interstellar',
        frameId: 'interstellar',
        position: [1, 0, 0],
        label: 'Transit begins',
        description: 'Hail Mary departs',
        importance: 2,
        actors: ['grace'],
      },
    ],
    segments: [
      {
        id: 's1',
        startTime: 0,
        endTime: 50,
        sceneId: 'earthDeparture',
        frameId: 'system',
        progressWeight: 1.0,
        label: 'Departure prep',
        interpolation: 'ease-in-out',
      },
      {
        id: 's2',
        startTime: 50,
        endTime: 200,
        sceneId: 'interstellar',
        frameId: 'interstellar',
        progressWeight: 0.3,
        label: 'Transit',
        interpolation: 'linear',
      },
    ],
    scenes: [
      { id: 'earthDeparture', frameId: 'system', label: 'Earth Departure', description: 'Launch', visibleBodies: ['earth'], transitionIn: 'fade', transitionDuration: 1000 },
      { id: 'interstellar', frameId: 'interstellar', label: 'Interstellar', description: 'Deep space', visibleBodies: ['hailMary'], transitionIn: 'cut', transitionDuration: 0 },
      { id: 'tauCeti', frameId: 'system', label: 'Tau Ceti', description: 'Arrival', visibleBodies: [], transitionIn: 'fade', transitionDuration: 500 },
      { id: 'encounter', frameId: 'encounter', label: 'Encounter', description: 'Contact', visibleBodies: [], transitionIn: 'cut', transitionDuration: 0 },
      { id: 'adrian', frameId: 'surface', label: 'Adrian', description: 'Surface', visibleBodies: [], transitionIn: 'fade', transitionDuration: 800 },
      { id: 'rescue', frameId: 'encounter', label: 'Rescue', description: 'Rescue', visibleBodies: [], transitionIn: 'cut', transitionDuration: 0 },
      { id: 'eridian', frameId: 'encounter', label: 'Eridian', description: 'Rocky', visibleBodies: [], transitionIn: 'fade', transitionDuration: 600 },
    ],
    cameraShots: [
      {
        id: 'shot1',
        sceneId: 'earthDeparture',
        startChronoTime: 0,
        endChronoTime: 50,
        keyframes: [
          { progress: 0, position: [0, 10, 20], target: [0, 0, 0], fov: 60, easing: 'linear' },
          { progress: 1, position: [10, 5, 10], target: [0, 0, 0], fov: 50, easing: 'sine.inOut' },
        ],
        orbitOnPause: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests: coordinates.ts
// ---------------------------------------------------------------------------

describe('coordinates', () => {
  it('FRAME_CONFIGS all pass schema validation', () => {
    for (const [, config] of Object.entries(FRAME_CONFIGS)) {
      expect(CoordinateFrameConfigSchema.safeParse(config).success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: camera.ts
// ---------------------------------------------------------------------------

describe('camera', () => {
  it('CameraStateSchema accepts valid state', () => {
    const result = CameraStateSchema.safeParse({
      position: [0, 5, 10],
      target: [0, 0, 0],
      fov: 60,
    });
    expect(result.success).toBe(true);
  });

  it('CameraStateSchema rejects non-positive fov', () => {
    const result = CameraStateSchema.safeParse({
      position: [0, 5, 10],
      target: [0, 0, 0],
      fov: 0,
    });
    expect(result.success).toBe(false);
  });

  it('CameraModeSchema accepts valid modes', () => {
    expect(CameraModeSchema.safeParse('cinematic').success).toBe(true);
    expect(CameraModeSchema.safeParse('orbit').success).toBe(true);
    expect(CameraModeSchema.safeParse('transitioning').success).toBe(true);
    expect(CameraModeSchema.safeParse('free').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: timeline.schema.ts — happy path
// ---------------------------------------------------------------------------

describe('TimelineData validation — happy path', () => {
  it('accepts a valid minimal dataset', () => {
    const data = makeValid();
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validateTimeline returns typed data', () => {
    const data = makeValid();
    const parsed = validateTimeline(data);
    expect(parsed.events).toHaveLength(2);
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.scenes).toHaveLength(7);
    expect(parsed.cameraShots).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: timeline.schema.ts — custom refinements
// ---------------------------------------------------------------------------

describe('TimelineData validation — refinements', () => {
  it('rejects duplicate event IDs', () => {
    const data = makeValid();
    data.events[1].id = 'e1'; // duplicate
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes('Duplicate event ID'))).toBe(true);
    }
  });

  it('rejects events referencing unknown sceneId', () => {
    const data = makeValid();
    // Force an invalid sceneId — bypass TS with cast
    (data.events[0] as Record<string, unknown>).sceneId = 'nonexistent';
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects overlapping segments', () => {
    const data = makeValid();
    data.segments[1].startTime = 30; // overlaps with s1 [0, 50]
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes('overlap'))).toBe(true);
    }
  });

  it('rejects cameraShot keyframes not sorted by progress', () => {
    const data = makeValid();
    data.cameraShots[0].keyframes = [
      { progress: 1, position: [10, 5, 10], target: [0, 0, 0], fov: 50, easing: 'sine.inOut' },
      { progress: 0, position: [0, 10, 20], target: [0, 0, 0], fov: 60, easing: 'linear' },
    ];
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes('sorted by ascending progress'))).toBe(true);
    }
  });

  it('rejects progressWeight <= 0', () => {
    const data = makeValid();
    data.segments[0].progressWeight = 0;
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects negative progressWeight', () => {
    const data = makeValid();
    data.segments[0].progressWeight = -1;
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate segment IDs', () => {
    const data = makeValid();
    data.segments[1].id = 's1'; // duplicate
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes('Duplicate segment ID'))).toBe(true);
    }
  });

  it('rejects duplicate cameraShot IDs', () => {
    const data = makeValid();
    data.cameraShots.push({
      ...data.cameraShots[0],
      id: 'shot1', // duplicate
      startChronoTime: 100,
      endChronoTime: 200,
    });
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes('Duplicate cameraShot ID'))).toBe(true);
    }
  });

  it('allows events with equal chronologicalTime (simultaneous)', () => {
    const data = makeValid();
    data.events[1].chronologicalTime = 0; // same as e1
    const result = TimelineDataSchema.safeParse(data);
    // Should pass — simultaneous events are allowed
    // (as long as IDs are unique, which they are)
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: structural validation
// ---------------------------------------------------------------------------

describe('TimelineData validation — structural', () => {
  it('rejects empty events array (but passes — events can be empty)', () => {
    const data = makeValid();
    data.events = [];
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = TimelineDataSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid sceneId on event', () => {
    const data = makeValid();
    (data.events[0] as Record<string, unknown>).sceneId = 'bogus';
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid frameId on event', () => {
    const data = makeValid();
    (data.events[0] as Record<string, unknown>).frameId = 'galactic';
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects chapter out of range', () => {
    const data = makeValid();
    data.events[0].chapter = 0;
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects chapter > 31', () => {
    const data = makeValid();
    data.events[0].chapter = 32;
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid importance', () => {
    const data = makeValid();
    (data.events[0] as Record<string, unknown>).importance = 4;
    const result = TimelineDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validateTimeline throws with descriptive message', () => {
    expect(() => validateTimeline({})).toThrow('Timeline validation failed');
  });
});
