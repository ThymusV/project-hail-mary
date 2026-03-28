/**
 * App — root layout for the 3D space-time visualization.
 *
 * Three layers stacked:
 * 1. R3F Canvas (3D scene, full viewport)
 * 2. HTML UI overlay (timeline slider)
 * 3. Leva debug panel (dev only)
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';

import { InterstellarScene } from '@/components/canvas/scenes/InterstellarScene';
import { CameraRig } from '@/components/canvas/CameraRig';
import { Effects } from '@/components/canvas/Effects';
import { SceneTransition } from '@/components/canvas/SceneTransition';
import { TimelineSlider } from '@/components/ui/TimelineSlider';
import { InfoPanel } from '@/components/ui/InfoPanel';
import { ChapterNav } from '@/components/ui/ChapterNav';
import { HelpOverlay } from '@/components/ui/HelpOverlay';
import { StatusPanel } from '@/components/ui/StatusPanel';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import type { CameraShot } from '@/engine/cameraInterpolation';
import type { ProgressMapping } from '@/engine/timeMapping';
import timelineRaw from '@/data/timeline.json';

// ── Canvas inner content (requires R3F context) ──────────────────────

function SceneContent({
  cameraShots,
  mapping,
}: {
  cameraShots: CameraShot[];
  mapping: ProgressMapping;
}) {
  // Advance storyProgress each frame when playing
  useStoryProgress();

  return (
    <>
      <color attach="background" args={['#030308']} />
      <CameraRig cameraShots={cameraShots} progressMapping={mapping} />
      <InterstellarScene />
      <Effects />
      <SceneTransition />
    </>
  );
}

// ── Loading fallback ──────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Initializing visualization</p>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────

export default function App() {
  const data = useTimelineData();

  // Extract cameraShots directly from the raw JSON import
  const cameraShots = (timelineRaw as { cameraShots: CameraShot[] }).cameraShots;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#030308' }}>
      {/* Leva debug panel — collapsed & hidden in production */}
      <Leva
        collapsed
        hidden={import.meta.env.PROD}
        titleBar={{ title: 'Debug Controls' }}
      />

      {/* 3D Canvas Layer */}
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{
            position: [0, 5, 15],
            fov: 60,
            near: 0.01,
            far: 500,
          }}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          dpr={[1, 1.5]}
          style={{ background: '#030308' }}
          frameloop="always"
          onCreated={({ gl }) => {
            gl.setClearColor('#030308', 1);
          }}
        >
          <SceneContent
            cameraShots={cameraShots}
            mapping={data.mapping}
          />
        </Canvas>
      </Suspense>

      {/* CSS Vignette */}
      <div className="vignette-overlay" />

      {/* HTML UI Overlay */}
      <div className="ui-overlay">
        <ChapterNav />
        <StatusPanel />
        <TimelineSlider />
        <InfoPanel />
        <HelpOverlay />
      </div>
    </div>
  );
}
