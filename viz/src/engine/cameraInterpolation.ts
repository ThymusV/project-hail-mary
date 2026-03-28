/**
 * Pure-function camera interpolation.
 *
 * Given a chronological time and an ordered list of camera shots,
 * resolves which shot is active, finds the surrounding keyframes,
 * and returns an interpolated CameraState.
 */

import { applyEasing } from '../utils/easing.js';

// ── Inline types (reconciled with shared schema later) ───────────────

export interface CameraKeyframe {
  /** 0-1 local progress within the shot. */
  progress: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** GSAP-style easing name applied when interpolating *to* this keyframe. */
  easing: string;
}

export interface CameraShot {
  id: string;
  startChronoTime: number;
  endChronoTime: number;
  keyframes: CameraKeyframe[];
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Find the active shot for a given chronological time.
 * Returns the first shot whose range contains the time, or `null`.
 */
function findActiveShot(
  chronoTime: number,
  shots: CameraShot[],
): CameraShot | null {
  for (const shot of shots) {
    if (chronoTime >= shot.startChronoTime && chronoTime <= shot.endChronoTime) {
      return shot;
    }
  }
  return null;
}

/**
 * Find the two keyframes surrounding a local progress value.
 *
 * Keyframes must be sorted by `progress` (ascending).
 * Returns [from, to] where `from.progress <= localProgress <= to.progress`.
 *
 * Edge cases:
 * - Before first keyframe → clamp to first.
 * - After last keyframe → clamp to last.
 */
function findSurroundingKeyframes(
  localProgress: number,
  keyframes: CameraKeyframe[],
): [CameraKeyframe, CameraKeyframe] {
  if (keyframes.length === 1) {
    return [keyframes[0], keyframes[0]];
  }

  // Before the first keyframe
  if (localProgress <= keyframes[0].progress) {
    return [keyframes[0], keyframes[0]];
  }

  // After the last keyframe
  if (localProgress >= keyframes[keyframes.length - 1].progress) {
    const last = keyframes[keyframes.length - 1];
    return [last, last];
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    const from = keyframes[i];
    const to = keyframes[i + 1];
    if (localProgress >= from.progress && localProgress <= to.progress) {
      return [from, to];
    }
  }

  // Fallback (should not be reached with well-formed data).
  const last = keyframes[keyframes.length - 1];
  return [last, last];
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Pure function: chronologicalTime → CameraState.
 *
 * 1. Find the active CameraShot for the given time.
 * 2. Compute local progress (0-1) within that shot.
 * 3. Find the two surrounding keyframes.
 * 4. Interpolate position, target (lerp) and fov (lerp).
 * 5. Apply the easing curve from the "to" keyframe.
 *
 * Returns `null` if no shot covers the given time.
 */
export function interpolateCamera(
  chronoTime: number,
  shots: CameraShot[],
): CameraState | null {
  const shot = findActiveShot(chronoTime, shots);
  if (!shot) return null;

  // Keyframes must be sorted by progress.
  const keyframes = [...shot.keyframes].sort((a, b) => a.progress - b.progress);
  if (keyframes.length === 0) return null;

  // Local progress within the shot (0-1).
  const duration = shot.endChronoTime - shot.startChronoTime;
  const localProgress =
    duration === 0 ? 0 : (chronoTime - shot.startChronoTime) / duration;

  const [from, to] = findSurroundingKeyframes(localProgress, keyframes);

  // Raw interpolation factor between the two keyframes.
  const keyframeSpan = to.progress - from.progress;
  const rawT = keyframeSpan === 0
    ? 0
    : (localProgress - from.progress) / keyframeSpan;

  // Apply easing from the "to" keyframe.
  const easedT = applyEasing(rawT, to.easing);

  return {
    position: lerpVec3(from.position, to.position, easedT),
    target: lerpVec3(from.target, to.target, easedT),
    fov: lerpScalar(from.fov, to.fov, easedT),
  };
}
