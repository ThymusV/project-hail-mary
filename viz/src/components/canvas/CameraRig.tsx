/**
 * CameraRig — butter-smooth camera controller.
 *
 * SINGLE CAMERA OWNER: CameraControls is the sole writer.
 * - Playing: we compute the target from timeline interpolation,
 *   then call controlsRef.setLookAt() with smooth=false each frame.
 * - Paused: CameraControls handles user orbit/zoom with smoothTime.
 * - Recenter: smooth setLookAt back to the cinematic track.
 *
 * This eliminates the dual-ownership bug where direct camera.position
 * writes fought with CameraControls.
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

interface CameraRigProps {
  cameraShots: CameraShot[];
  progressMapping: ProgressMapping;
}

const DAMP_LAMBDA = 6;

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

export function CameraRig({ cameraShots, progressMapping }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<CameraControlsImpl>(null!);

  // Smooth interpolation targets
  const smoothPos = useRef(new THREE.Vector3(0, 5, 15));
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
  const smoothFov = useRef(60);
  const initialized = useRef(false);

  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const recenterRequestId = useTimelineStore((s) => s.recenterRequestId);
  const lastRecenterId = useRef(0);

  // Initialize smooth refs from first camera shot
  useEffect(() => {
    if (initialized.current) return;
    const progress = useTimelineStore.getState().storyProgress;
    const chronoTime = progressToTime(progress, progressMapping);
    const target = interpolateCamera(chronoTime, cameraShots);
    if (target) {
      smoothPos.current.set(...target.position);
      smoothTarget.current.set(...target.target);
      smoothFov.current = target.fov;

      // Set camera immediately on first mount
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothTarget.current);
      if ((camera as THREE.PerspectiveCamera).fov !== undefined) {
        (camera as THREE.PerspectiveCamera).fov = target.fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }

      // Also set CameraControls initial state
      if (controlsRef.current) {
        controlsRef.current.setLookAt(
          ...target.position,
          ...target.target,
          false,
        );
      }
      initialized.current = true;
    }
  }, [camera, cameraShots, progressMapping]);

  // Handle recenter requests
  useEffect(() => {
    if (recenterRequestId > lastRecenterId.current) {
      lastRecenterId.current = recenterRequestId;

      const progress = useTimelineStore.getState().storyProgress;
      const chronoTime = progressToTime(progress, progressMapping);
      const target = interpolateCamera(chronoTime, cameraShots);
      if (!target || !controlsRef.current) return;

      controlsRef.current.setLookAt(
        ...target.position,
        ...target.target,
        true, // smooth transition
      );

      smoothPos.current.set(...target.position);
      smoothTarget.current.set(...target.target);
      smoothFov.current = target.fov;
    }
  }, [recenterRequestId, camera, cameraShots, progressMapping]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1);
    const progress = useTimelineStore.getState().storyProgress;
    const playing = useTimelineStore.getState().isPlaying;

    const chronoTime = progressToTime(progress, progressMapping);
    const target = interpolateCamera(chronoTime, cameraShots);
    if (!target) return;

    const targetPos = new THREE.Vector3(...target.position);
    const targetLook = new THREE.Vector3(...target.target);
    const targetFov = target.fov;

    if (playing && controlsRef.current) {
      // Smooth damp toward cinematic target
      dampVec3(smoothPos.current, targetPos, DAMP_LAMBDA, dt);
      dampVec3(smoothTarget.current, targetLook, DAMP_LAMBDA, dt);
      smoothFov.current = THREE.MathUtils.damp(smoothFov.current, targetFov, DAMP_LAMBDA, dt);

      // Drive camera through CameraControls (single owner)
      controlsRef.current.setLookAt(
        smoothPos.current.x, smoothPos.current.y, smoothPos.current.z,
        smoothTarget.current.x, smoothTarget.current.y, smoothTarget.current.z,
        false, // no transition, we're damping ourselves
      );

      // Update FOV
      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.fov !== undefined) {
        perspCam.fov = smoothFov.current;
        perspCam.updateProjectionMatrix();
      }
    } else {
      // Paused: CameraControls handles orbit. Track smooth targets loosely.
      dampVec3(smoothPos.current, targetPos, DAMP_LAMBDA * 0.3, dt);
      dampVec3(smoothTarget.current, targetLook, DAMP_LAMBDA * 0.3, dt);
      smoothFov.current = THREE.MathUtils.damp(smoothFov.current, targetFov, DAMP_LAMBDA * 0.3, dt);
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
