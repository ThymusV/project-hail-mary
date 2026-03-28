/**
 * Scene — top-level 3D scene composition.
 *
 * Mounts the active scene content based on store state,
 * manages the camera rig, post-processing, and transition overlay.
 */

import { useMemo, useRef } from 'react';
import { StarField } from './StarField';
import { Trajectory } from './Trajectory';
import { Spacecraft } from './Spacecraft';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';
import { Labels } from './Labels';
import { SceneTransition } from './SceneTransition';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import {
  buildProgressMapping,
  progressToTime,
} from '@/engine/timeMapping';
import type { ProgressMapping } from '@/engine/timeMapping';
import type { CameraShot } from '@/engine/cameraInterpolation';
import type { TimelineData, Segment } from '@/types/timeline';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useSceneStore } from '@/stores/useSceneStore';
import { useFrame } from '@react-three/fiber';

// ── Props ───────────────────────────────────────────────────────────────

interface SceneProps {
  timelineData: TimelineData;
}

// ── Scene content router ────────────────────────────────────────────────

/**
 * Determines which 3D elements to render based on the current
 * segment's frameId. For the MVP, all interstellar-frame content
 * is always mounted (star field, trajectory, spacecraft, labels).
 * Other frame content will be added in later phases.
 */
function SceneContent({ activeFrameId }: { activeFrameId: string | null }) {
  // For now, render the interstellar view as the primary scene.
  // Future phases will conditionally mount system/encounter/surface scenes.
  const showInterstellar = !activeFrameId || activeFrameId === 'interstellar';
  const showAnyScene = true; // Star field is always visible as backdrop

  return (
    <group>
      {/* Star field is always rendered as a cosmic backdrop */}
      {showAnyScene && <StarField />}

      {/* Interstellar-specific elements */}
      {showInterstellar && (
        <>
          <Trajectory />
          <Spacecraft />
          <Labels />
        </>
      )}

      {/* Ambient light for basic illumination */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#fff4ea" distance={30} decay={2} />
    </group>
  );
}

// ── Scene orchestrator ──────────────────────────────────────────────────

/**
 * Keeps stores in sync with the current progress.
 * Resolves the active segment, scene, and frame from storyProgress.
 */
function useSceneSync(segments: Segment[], progressMapping: ProgressMapping) {
  const setActiveSceneId = useTimelineStore((s) => s.setActiveSceneId);
  const setActiveSegmentId = useTimelineStore((s) => s.setActiveSegmentId);
  const setChronologicalTime = useTimelineStore((s) => s.setChronologicalTime);
  const setSceneStoreScene = useSceneStore((s) => s.setScene);

  // Track previous scene to detect transitions
  const prevSceneRef = useRef('');

  useFrame(() => {
    const progress = useTimelineStore.getState().storyProgress;
    const chronoTime = progressToTime(progress, progressMapping);

    // Update chrono time
    setChronologicalTime(chronoTime);

    // Find active segment
    let activeSegment: Segment | null = null;
    for (const seg of segments) {
      if (chronoTime >= seg.startTime && chronoTime <= seg.endTime) {
        activeSegment = seg;
        break;
      }
    }

    if (activeSegment) {
      const sceneId = activeSegment.sceneId;
      const segId = activeSegment.id;

      // Only update store when values actually change
      if (useTimelineStore.getState().activeSegmentId !== segId) {
        setActiveSegmentId(segId);
      }

      if (useTimelineStore.getState().activeSceneId !== sceneId) {
        // Scene changed — could trigger a transition
        const prevScene = prevSceneRef.current;
        if (prevScene && prevScene !== sceneId) {
          // In future: trigger fade transition here
          // For now, just switch immediately
        }
        prevSceneRef.current = sceneId;
        setActiveSceneId(sceneId);
        setSceneStoreScene(sceneId);
      }
    }
  });
}

// ── Main Scene component ────────────────────────────────────────────────

export function Scene({ timelineData }: SceneProps) {
  // Build progress mapping from segments
  const progressMapping = useMemo<ProgressMapping>(() => {
    return buildProgressMapping(
      timelineData.segments.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        progressWeight: s.progressWeight,
      })),
    );
  }, [timelineData.segments]);

  // Camera shots for interpolation
  const cameraShots = useMemo<CameraShot[]>(() => {
    return timelineData.cameraShots.map((shot) => ({
      id: shot.id,
      startChronoTime: shot.startChronoTime,
      endChronoTime: shot.endChronoTime,
      keyframes: shot.keyframes.map((kf) => ({
        progress: kf.progress,
        position: kf.position as [number, number, number],
        target: kf.target as [number, number, number],
        fov: kf.fov,
        easing: kf.easing,
      })),
    }));
  }, [timelineData.cameraShots]);

  // Drive playback
  useStoryProgress();

  // Keep stores in sync
  useSceneSync(timelineData.segments, progressMapping);

  // Read active frame for routing
  const activeSceneId = useTimelineStore((s) => s.activeSceneId);
  const activeScene = timelineData.scenes.find((s) => s.id === activeSceneId);
  const activeFrameId = activeScene?.frameId ?? null;

  return (
    <>
      <SceneContent activeFrameId={activeFrameId} />
      <CameraRig cameraShots={cameraShots} progressMapping={progressMapping} />
      <Effects />
      <SceneTransition />
    </>
  );
}
