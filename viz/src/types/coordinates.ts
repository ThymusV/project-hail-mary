/**
 * Coordinate frame definitions for multi-scale 3D space visualization.
 *
 * Each frame represents a different spatial scale:
 *   - interstellar: light-year scale, for Sol-to-Tau Ceti transit
 *   - system:       AU scale, for orbital mechanics within a star system
 *   - encounter:    meter scale, for ship-to-ship interactions
 *   - surface:      meter scale, for planetary surface / interior scenes
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Coordinate Frame ID
// ---------------------------------------------------------------------------

export const COORDINATE_FRAME_IDS = [
  'interstellar',
  'system',
  'encounter',
  'surface',
] as const;

export const CoordinateFrameIdSchema = z.enum(COORDINATE_FRAME_IDS);
export type CoordinateFrameId = z.infer<typeof CoordinateFrameIdSchema>;

// ---------------------------------------------------------------------------
// Coordinate Frame Config
// ---------------------------------------------------------------------------

export const CoordinateFrameConfigSchema = z.object({
  id: CoordinateFrameIdSchema,
  /** Human-readable description of the unit scale, e.g. "1 unit = 1 light-year" */
  scale: z.string(),
  /** Camera near clipping plane distance */
  near: z.number().positive(),
  /** Camera far clipping plane distance */
  far: z.number().positive(),
  /** Background color as a hex string */
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color'),
});

export type CoordinateFrameConfig = z.infer<typeof CoordinateFrameConfigSchema>;

// ---------------------------------------------------------------------------
// Canonical frame configurations
// ---------------------------------------------------------------------------

export const FRAME_CONFIGS: Record<CoordinateFrameId, CoordinateFrameConfig> = {
  interstellar: {
    id: 'interstellar',
    scale: '1 unit = 1 light-year',
    near: 0.01,
    far: 500,
    background: '#030308',
  },
  system: {
    id: 'system',
    scale: '1 unit = 0.01 AU',
    near: 0.001,
    far: 100,
    background: '#050510',
  },
  encounter: {
    id: 'encounter',
    scale: '1 unit = 1 meter',
    near: 0.1,
    far: 1000,
    background: '#050510',
  },
  surface: {
    id: 'surface',
    scale: '1 unit = 1 meter',
    near: 0.1,
    far: 5000,
    background: '#0a0a1a',
  },
} as const;

// Runtime sanity check: validate the canonical configs against the schema
for (const [key, config] of Object.entries(FRAME_CONFIGS)) {
  const result = CoordinateFrameConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid FRAME_CONFIGS entry "${key}": ${JSON.stringify(result.error.issues)}`,
    );
  }
}
