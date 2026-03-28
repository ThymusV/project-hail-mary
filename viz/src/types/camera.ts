/**
 * Camera state and mode types for the 3D visualization engine.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Vec3 helper (reused across camera types)
// ---------------------------------------------------------------------------

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

// ---------------------------------------------------------------------------
// Camera State — the instantaneous pose of the camera
// ---------------------------------------------------------------------------

export const CameraStateSchema = z.object({
  /** Camera world position [x, y, z] */
  position: Vec3Schema,
  /** Look-at target [x, y, z] */
  target: Vec3Schema,
  /** Vertical field of view in degrees */
  fov: z.number().positive(),
});

export type CameraState = z.infer<typeof CameraStateSchema>;

// ---------------------------------------------------------------------------
// Camera Mode — what is controlling the camera right now
// ---------------------------------------------------------------------------

export const CAMERA_MODES = ['cinematic', 'orbit', 'transitioning'] as const;

export const CameraModeSchema = z.enum(CAMERA_MODES);
export type CameraMode = z.infer<typeof CameraModeSchema>;
