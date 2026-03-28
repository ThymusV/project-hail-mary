/**
 * App — root layout for the 3D space-time visualization.
 *
 * INIT FLOW:
 * 1. index.html inline style → black background immediately
 * 2. React mounts → dark root div
 * 3. Canvas mounts → gl.setClearColor('#030308') in onCreated
 * 4. Suspense INSIDE Canvas wraps scene children (not the Canvas itself)
 * 5. Effects useLayoutEffect creates EffectComposer before first frame
 * 6. useFrame renders scene (with fallback if composer not ready)
 *
 * IMPORTANT: Suspense is inside Canvas, not around it. This prevents
 * full WebGL tree remounts when Labels/Text suspend during font loading.
 */

import { Suspense, Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';

import { InterstellarScene } from '@/components/canvas/scenes/InterstellarScene';
import { CameraRig } from '@/components/canvas/CameraRig';
import { Effects } from '@/components/canvas/Effects';
import { TimelineSlider } from '@/components/ui/TimelineSlider';
import { InfoPanel } from '@/components/ui/InfoPanel';
import { ChapterNav } from '@/components/ui/ChapterNav';
import { HelpOverlay } from '@/components/ui/HelpOverlay';
import { StatusPanel } from '@/components/ui/StatusPanel';
import { Legend } from '@/components/ui/Legend';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import type { CameraShot } from '@/engine/cameraInterpolation';
import type { ProgressMapping } from '@/engine/timeMapping';
import timelineRaw from '@/data/timeline.json';

// ── Error Boundary ──────────────────────────────────────────────────

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { error: string | null; }

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: '#030308', color: '#ff6b6b', fontFamily: 'system-ui',
          flexDirection: 'column', gap: 8, padding: 32,
        }}>
          <h2 style={{ fontSize: 18 }}>Render Error</h2>
          <pre style={{ fontSize: 12, color: '#888', maxWidth: 500, whiteSpace: 'pre-wrap' }}>
            {this.state.error}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Canvas inner content ──────────────────────────────────────────────

function SceneContent({
  cameraShots,
  mapping,
}: {
  cameraShots: CameraShot[];
  mapping: ProgressMapping;
}) {
  useStoryProgress();

  return (
    <>
      <color attach="background" args={['#030308']} />

      {/* CameraRig and Effects mount unconditionally — no Suspense */}
      <CameraRig cameraShots={cameraShots} progressMapping={mapping} />
      <Effects />

      {/* Scene content wrapped in Suspense — Labels/Text may suspend for font loading */}
      <Suspense fallback={null}>
        <InterstellarScene />
      </Suspense>
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────

export default function App() {
  const data = useTimelineData();
  // JSON arrays are number[], cast to the tuple types CameraShot expects
  const cameraShots = (timelineRaw.cameraShots as unknown as CameraShot[]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#030308' }}>
      <Leva
        collapsed
        hidden={import.meta.env.PROD}
        titleBar={{ title: 'Debug Controls' }}
      />

      {/* Canvas mounts immediately — no Suspense around it */}
      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 5, 15], fov: 60, near: 0.01, far: 500 }}
          gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
          dpr={[1, 1.5]}
          style={{ background: '#030308' }}
          frameloop="always"
          onCreated={({ gl }) => {
            gl.setClearColor('#030308', 1);
          }}
        >
          <SceneContent cameraShots={cameraShots} mapping={data.mapping} />
        </Canvas>
      </CanvasErrorBoundary>

      {/* CSS Vignette */}
      <div className="vignette-overlay" />

      {/* HTML UI Overlay */}
      <div className="ui-overlay">
        <ChapterNav />
        <StatusPanel />
        <TimelineSlider />
        <InfoPanel />
        <Legend />
        <HelpOverlay />
      </div>
    </div>
  );
}
