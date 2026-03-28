/**
 * CameraRig -- butter-smooth camera controller.
 *
 * Reads storyProgress, maps to chronological time, interpolates
 * camera keyframes, and DAMPS toward the target.
 *
 * Uses CameraControls from drei for Apple-quality scroll inertia.
 * Dual damping: PLAYING_DAMP (fast) when playing, PAUSED_DAMP
 * (relaxed) when paused.  Recenter via recenterRequestId.
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { interpolateCamera } from '@/engine/cameraInterpolation';
import { progressToTime } from '@/engine/timeMapping';
import type { CameraShot } from '@/engine/cameraInterpolation';
import type { ProgressMapping } from '@/engine/timeMapping';

// ── Types ───────────────────────────────────────────────────────────────

interface CameraRigProps {
  cameraShots: CameraShot[];
  progressMapping: ProgressMapping;
}

// ── Damping helpers ─────────────────────────────────────────────────────

/** Faster tracking when playing so camera follows the action. */
const PLAYING_DAMP = 8;
/** Softer feel when paused for comfortable manual orbit. */
const PAUSED_DAMP = 4;

function dampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number,
): void {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, dt);
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, dt);
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, dt);
}

// ── Component ───────────────────────────────────────────────────────────

export function CameraRig({ cameraShots, progressMapping }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<CameraControlsImpl>(null!);

  // Smooth interpolation targets (mutable refs to avoid GC)
  const smoothPos = useRef(new THREE.Vector3(0, 5, 15));
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
  const smoothFov = useRef(60);

  // Track whether we're in orbit mode (paused free-look)
  const isOrbiting = useRef(false);
  // Blend factor for transitioning from orbit back to cinematic
  const orbitBlend = useRef(0);
  // Snapshot of orbit camera state when playback resumes
  const orbitSnapshot = useRef({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  });

  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const recenterRequestId = useTimelineStore((s) => s.recenterRequestId);
  const lastRecenterId = useRef(0);

  // When paused, enable orbit controls; on play, snapshot and disable
  useEffect(() => {
    if (!isPlaying) {
      isOrbiting.current = true;
      orbitBlend.current = 0;
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    } else {
      if (isOrbiting.current && controlsRef.current) {
        orbitSnapshot.current.position.copy(camera.position);
        controlsRef.current.getTarget(orbitSnapshot.current.target);
        controlsRef.current.enabled = false;
      }
      isOrbiting.current = false;
      orbitBlend.current = 0;
    }
  }, [isPlaying, camera]);

  // Handle recenter requests -- smoothly animate back to cinematic track
  useEffect(() => {
    if (recenterRequestId > lastRecenterId.current) {
      lastRecenterId.current = recenterRequestId;

      const progress = useTimelineStore.getState().storyProgress;
      const chronoTime = progressToTime(progress, progressMapping);
      const camTarget = interpolateCamera(chronoTime, cameraShots);
      if (!camTarget) return;

      const targetPos = new THREE.Vector3(...camTarget.position);
      const targetLook = new THREE.Vector3(...camTarget.target);

      // Use CameraControls' built-in smooth transition
      if (controlsRef.current) {
        controlsRef.current.setLookAt(
          targetPos.x, targetPos.y, targetPos.z,
          targetLook.x, targetLook.y, targetLook.z,
          true, // enableTransition = smooth
        );
      }

      // Snap smooth refs
      smoothPos.current.copy(targetPos);
      smoothTarget.current.copy(targetLook);
      smoothFov.current = camTarget.fov;

      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.fov !== undefined) {
        perspCam.fov = camTarget.fov;
        perspCam.updateProjectionMatrix();
      }

      isOrbiting.current = !useTimelineStore.getState().isPlaying;
      orbitBlend.current = 1;
    }
  }, [recenterRequestId, camera, cameraShots, progressMapping]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1);
    const progress = useTimelineStore.getState().storyProgress;
    const playing = useTimelineStore.getState().isPlaying;

    // Derive chronological time and camera target
    const chronoTime = progressToTime(progress, progressMapping);
    const camTarget = interpolateCamera(chronoTime, cameraShots);

    if (!camTarget) return;

    const targetPos = new THREE.Vector3(...camTarget.position);
    const targetLook = new THREE.Vector3(...camTarget.target);
    const targetFov = camTarget.fov;

    const damp = playing ? PLAYING_DAMP : PAUSED_DAMP;

    if (playing) {
      // Smooth transition from orbit snapshot back to cinematic
      if (orbitBlend.current < 1) {
        orbitBlend.current = Math.min(1, orbitBlend.current + dt * 2.0);
        const t = easeOutCubic(orbitBlend.current);

        const blendPos = orbitSnapshot.current.position.clone().lerp(targetPos, t);
        const blendTarget = orbitSnapshot.current.target.clone().lerp(targetLook, t);

        smoothPos.current.copy(blendPos);
        smoothTarget.current.copy(blendTarget);
        smoothFov.current = THREE.MathUtils.lerp(smoothFov.current, targetFov, t);
      } else {
        dampVec3(smoothPos.current, targetPos, damp, dt);
        dampVec3(smoothTarget.current, targetLook, damp, dt);
        smoothFov.current = THREE.MathUtils.damp(
          smoothFov.current,
          targetFov,
          damp,
          dt,
        );
      }

      // Apply to camera
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothTarget.current);
      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.fov !== undefined) {
        perspCam.fov = smoothFov.current;
        perspCam.updateProjectionMatrix();
      }
    } else {
      // Paused -- orbit controls handle camera. Still damp smooth targets
      // so resuming playback starts from a known smooth state.
      dampVec3(smoothPos.current, targetPos, damp * 0.5, dt);
      dampVec3(smoothTarget.current, targetLook, damp * 0.5, dt);
      smoothFov.current = THREE.MathUtils.damp(
        smoothFov.current,
        targetFov,
        damp * 0.5,
        dt,
      );
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={!isPlaying}
      smoothTime={0.35}
      draggingSmoothTime={0.15}
      minDistance={0.5}
      maxDistance={300}
    />
  );
}

// ── Easing ──────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
