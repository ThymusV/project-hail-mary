/**
 * CameraRig — butter-smooth camera controller.
 *
 * Reads storyProgress, maps to chronological time, interpolates
 * camera keyframes, and DAMPS toward the target. When paused,
 * enables OrbitControls for free look; on resume, smoothly
 * transitions back to the cinematic track.
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
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

/**
 * THREE.MathUtils.damp is frame-rate independent exponential smoothing.
 * `lambda` = higher is faster. 4-5 feels Apple-quality: responsive
 * without being jittery, with pleasant inertia on fast scrubs.
 */
const DAMP_LAMBDA = 4.5;

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
  const controlsRef = useRef<OrbitControlsImpl>(null!);

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

  // When paused, enable orbit controls
  useEffect(() => {
    if (!isPlaying) {
      // Entering orbit mode
      isOrbiting.current = true;
      orbitBlend.current = 0;
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    } else {
      // Resuming playback — snapshot the current orbit camera state
      if (isOrbiting.current && controlsRef.current) {
        orbitSnapshot.current.position.copy(camera.position);
        orbitSnapshot.current.target.copy(controlsRef.current.target);
        controlsRef.current.enabled = false;
      }
      isOrbiting.current = false;
      orbitBlend.current = 0;
    }
  }, [isPlaying, camera]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1);
    const progress = useTimelineStore.getState().storyProgress;
    const playing = useTimelineStore.getState().isPlaying;

    // Derive chronological time and camera target
    const chronoTime = progressToTime(progress, progressMapping);
    const target = interpolateCamera(chronoTime, cameraShots);

    if (!target) return;

    const targetPos = new THREE.Vector3(...target.position);
    const targetLook = new THREE.Vector3(...target.target);
    const targetFov = target.fov;

    if (playing) {
      // Smooth transition from orbit snapshot back to cinematic
      if (orbitBlend.current < 1) {
        orbitBlend.current = Math.min(1, orbitBlend.current + dt * 2.0);
        const t = easeOutCubic(orbitBlend.current);

        // Blend from snapshot to cinematic target
        const blendPos = orbitSnapshot.current.position.clone().lerp(targetPos, t);
        const blendTarget = orbitSnapshot.current.target.clone().lerp(targetLook, t);

        smoothPos.current.copy(blendPos);
        smoothTarget.current.copy(blendTarget);
        smoothFov.current = THREE.MathUtils.lerp(smoothFov.current, targetFov, t);
      } else {
        // Normal cinematic damping
        dampVec3(smoothPos.current, targetPos, DAMP_LAMBDA, dt);
        dampVec3(smoothTarget.current, targetLook, DAMP_LAMBDA, dt);
        smoothFov.current = THREE.MathUtils.damp(
          smoothFov.current,
          targetFov,
          DAMP_LAMBDA,
          dt,
        );
      }

      // Apply to camera — direct mutation is the standard R3F pattern
      // eslint-disable-next-line react-hooks/immutability
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothTarget.current);
      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.fov !== undefined) {
        // eslint-disable-next-line react-hooks/immutability
        perspCam.fov = smoothFov.current;
        perspCam.updateProjectionMatrix();
      }
    } else {
      // Paused — orbit controls handle camera. Still damp smooth targets
      // so resuming playback starts from a known smooth state.
      dampVec3(smoothPos.current, targetPos, DAMP_LAMBDA * 0.5, dt);
      dampVec3(smoothTarget.current, targetLook, DAMP_LAMBDA * 0.5, dt);
      smoothFov.current = THREE.MathUtils.damp(
        smoothFov.current,
        targetFov,
        DAMP_LAMBDA * 0.5,
        dt,
      );

      // Update orbit controls target to follow cinematic loosely
      // (so when user hasn't touched orbit, it stays roughly right)
      if (controlsRef.current && !controlsRef.current.enabled) {
        controlsRef.current.target.copy(smoothTarget.current);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isPlaying}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.5}
      maxDistance={300}
      enablePan
      panSpeed={0.5}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
    />
  );
}

// ── Easing ──────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
