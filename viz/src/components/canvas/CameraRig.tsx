/**
 * CameraRig — multi-mode camera controller.
 *
 * Three modes (from useCameraStore):
 *   'follow'   – auto-follow cinematic track, user can still interact
 *   'overview' – fixed wide-angle of full trajectory
 *   'free'     – full user control, auto-reverts after 3s idle
 *
 * CameraControls is ALWAYS enabled so user can interact at any time.
 * In 'follow' mode, we drive CameraControls via setLookAt each frame.
 * User mouse/wheel input triggers switch to 'free' mode temporarily.
 */

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { interpolateCamera } from '@/engine/cameraInterpolation';
import { progressToTime } from '@/engine/timeMapping';
import type { CameraShot } from '@/engine/cameraInterpolation';
import type { ProgressMapping } from '@/engine/timeMapping';

interface CameraRigProps {
  cameraShots: CameraShot[];
  progressMapping: ProgressMapping;
}

/** Camera snaps to target quickly in follow mode */
const FOLLOW_DAMP = 10;
/** Slow drift in overview mode */
const OVERVIEW_DAMP = 3;

/** Fixed overview position: sees the entire trajectory */
const OVERVIEW_POS: [number, number, number] = [2, 12, 22];
const OVERVIEW_TARGET: [number, number, number] = [2, 0, 0];
const OVERVIEW_FOV = 50;

function dampVec3(current: THREE.Vector3, target: THREE.Vector3, lambda: number, dt: number) {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, dt);
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, dt);
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, dt);
}

export function CameraRig({ cameraShots, progressMapping }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<CameraControlsImpl>(null!);

  const smoothPos = useRef(new THREE.Vector3(0, 5, 15));
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
  const smoothFov = useRef(60);
  const initialized = useRef(false);

  const recenterRequestId = useTimelineStore((s) => s.recenterRequestId);
  const lastRecenterId = useRef(0);

  // Listen for user interaction on the CameraControls
  const onControlStart = useCallback(() => {
    useCameraStore.getState().notifyUserInteraction();
  }, []);

  // Initialize from first camera shot
  useEffect(() => {
    if (initialized.current) return;
    const progress = useTimelineStore.getState().storyProgress;
    const chronoTime = progressToTime(progress, progressMapping);
    const target = interpolateCamera(chronoTime, cameraShots);
    if (target) {
      smoothPos.current.set(...target.position);
      smoothTarget.current.set(...target.target);
      smoothFov.current = target.fov;
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothTarget.current);
      const pc = camera as THREE.PerspectiveCamera;
      if (pc.fov !== undefined) { pc.fov = target.fov; pc.updateProjectionMatrix(); }
      if (controlsRef.current) {
        controlsRef.current.setLookAt(...target.position, ...target.target, false);
      }
      initialized.current = true;
    }
  }, [camera, cameraShots, progressMapping]);

  // Handle recenter: switch back to follow + animate
  useEffect(() => {
    if (recenterRequestId > lastRecenterId.current) {
      lastRecenterId.current = recenterRequestId;
      useCameraStore.getState().setMode('follow');

      const progress = useTimelineStore.getState().storyProgress;
      const chronoTime = progressToTime(progress, progressMapping);
      const target = interpolateCamera(chronoTime, cameraShots);
      if (!target || !controlsRef.current) return;
      controlsRef.current.setLookAt(...target.position, ...target.target, true);
      smoothPos.current.set(...target.position);
      smoothTarget.current.set(...target.target);
      smoothFov.current = target.fov;
    }
  }, [recenterRequestId, camera, cameraShots, progressMapping]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1);
    const mode = useCameraStore.getState().mode;

    // Tick idle timer for auto-revert from free to follow
    useCameraStore.getState().tickIdle(dt);

    const progress = useTimelineStore.getState().storyProgress;
    const chronoTime = progressToTime(progress, progressMapping);
    const target = interpolateCamera(chronoTime, cameraShots);
    if (!target) return;

    if (mode === 'follow') {
      const targetPos = new THREE.Vector3(...target.position);
      const targetLook = new THREE.Vector3(...target.target);

      dampVec3(smoothPos.current, targetPos, FOLLOW_DAMP, dt);
      dampVec3(smoothTarget.current, targetLook, FOLLOW_DAMP, dt);
      smoothFov.current = THREE.MathUtils.damp(smoothFov.current, target.fov, FOLLOW_DAMP, dt);

      if (controlsRef.current) {
        controlsRef.current.setLookAt(
          smoothPos.current.x, smoothPos.current.y, smoothPos.current.z,
          smoothTarget.current.x, smoothTarget.current.y, smoothTarget.current.z,
          false,
        );
      }
      const pc = camera as THREE.PerspectiveCamera;
      if (pc.fov !== undefined) { pc.fov = smoothFov.current; pc.updateProjectionMatrix(); }

    } else if (mode === 'overview') {
      const ovPos = new THREE.Vector3(...OVERVIEW_POS);
      const ovTgt = new THREE.Vector3(...OVERVIEW_TARGET);

      dampVec3(smoothPos.current, ovPos, OVERVIEW_DAMP, dt);
      dampVec3(smoothTarget.current, ovTgt, OVERVIEW_DAMP, dt);
      smoothFov.current = THREE.MathUtils.damp(smoothFov.current, OVERVIEW_FOV, OVERVIEW_DAMP, dt);

      if (controlsRef.current) {
        controlsRef.current.setLookAt(
          smoothPos.current.x, smoothPos.current.y, smoothPos.current.z,
          smoothTarget.current.x, smoothTarget.current.y, smoothTarget.current.z,
          false,
        );
      }
      const pc = camera as THREE.PerspectiveCamera;
      if (pc.fov !== undefined) { pc.fov = smoothFov.current; pc.updateProjectionMatrix(); }

    } else {
      // 'free' mode: CameraControls handles everything.
      // Just keep smooth refs updated so returning to follow is seamless.
      dampVec3(smoothPos.current, new THREE.Vector3(...target.position), FOLLOW_DAMP * 0.2, dt);
      dampVec3(smoothTarget.current, new THREE.Vector3(...target.target), FOLLOW_DAMP * 0.2, dt);
      smoothFov.current = THREE.MathUtils.damp(smoothFov.current, target.fov, FOLLOW_DAMP * 0.2, dt);
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled
      smoothTime={0.35}
      draggingSmoothTime={0.15}
      minDistance={0.5}
      maxDistance={300}
      onStart={onControlStart}
    />
  );
}
