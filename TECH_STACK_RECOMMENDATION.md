# Technical Stack Recommendation: Interactive 3D Space-Time Visualization

## Project: Project Hail Mary Timeline Visualization
**Date:** 2026-03-28
**Purpose:** Interactive WebGL visualization of protagonist's journey (Earth to Tau Ceti, ~12 light-years)

---

## 1. Recommended Stack

### Core Rendering: React Three Fiber (R3F) + Drei

**Winner: React Three Fiber over raw Three.js and Babylon.js**

| Criterion | Three.js (raw) | React Three Fiber | Babylon.js |
|-----------|----------------|-------------------|------------|
| Agent-friendliness | Medium - imperative, verbose | **High** - declarative JSX, small components | Low - large API surface, fewer training examples |
| Space viz ecosystem | Good (manual setup) | **Best** (Drei helpers + Three.js access) | Good (built-in, but overkill) |
| React integration | Manual | **Native** | Wrapper (newer, less mature) |
| Community size | Very large | **Large and growing (40%+ YoY)** | Medium |
| AI training data | High | **Highest for React projects** | Medium |
| Bundle size | ~600kb | ~600kb + React | ~1MB+ |
| Performance | Direct control | **Same as Three.js** (thin wrapper) | Comparable |

**Justification:**
- R3F is a thin React renderer for Three.js -- it does NOT add overhead; it IS Three.js with declarative syntax.
- Declarative JSX components are ideal for AI agents: small, self-contained, composable files.
- The `pmndrs` ecosystem (R3F, Drei, Zustand, Leva, postprocessing) is built by the same team and integrates seamlessly.
- ~80% of modern AI coding tools are optimized for the React + TypeScript stack.
- Three.js mutations happen in `useFrame` for 60fps performance, avoiding React reconciliation overhead.
- Every Three.js example can be adapted to R3F, giving access to the full Three.js ecosystem.

### Animation: GSAP (primary) + useFrame lerp/damp (secondary)

**GSAP 3.14** is now 100% free (including ScrollTrigger, MotionPath, all bonus plugins).

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| **GSAP Timeline** | Sequencing, easing library, onUpdate callbacks, scrubbing | External to React paradigm |
| framer-motion | React-native, great for UI | Poor fit for Three.js camera/3D |
| drei/spring | R3F-native | Limited sequencing, no timeline scrub |
| Custom useFrame | Zero dependencies, frame-perfect | Manual easing, complex sequencing |

**Recommendation:** Use GSAP for orchestrated timeline sequences (camera flights between waypoints, scroll-driven narrative) and `useFrame` with `THREE.MathUtils.damp()` for continuous per-frame animations (star twinkle, particle drift, orbit rotation).

### Post-Processing: @react-three/postprocessing

- Bloom with `luminanceThreshold={1}` for selective star glow
- `toneMapped={false}` on emissive materials to push values above 1.0
- `mipmapBlur` for performant bloom
- ToneMapping as final pass in EffectComposer

### Text Rendering: Drei `<Text>` (which wraps troika-three-text)

- Drei's `<Text>` component uses troika-three-text under the hood (SDF rendering)
- GPU-accelerated glyph generation, web worker for font parsing
- For HTML-style overlays (tooltips, detailed info panels): Drei's `<Html>` component
- For permanent 3D labels (star names, distances): `<Text>` in the scene graph

### Application Framework: Vite + React 19 + TypeScript

| Option | Agent-friendliness | Dev Experience | Build Speed |
|--------|-------------------|---------------|------------|
| **Vite + React** | **Best** - minimal config, fast HMR | Excellent | Fastest |
| Next.js | Good but SSR complexity | Good | Slower cold start |
| Vanilla JS | Poor - no component model for agents | Manual everything | Fast |

**TypeScript is strongly recommended over JavaScript for AI agent development:**
- Types serve as inline documentation that agents can read
- Autocompletion and type errors catch agent mistakes immediately
- ~80% of developers favor TS for large-scale applications
- AI models produce higher-quality TypeScript than JavaScript

### State Management: Zustand 5.x

- Built by the same team as R3F (pmndrs)
- ~1kb gzipped, hooks-based, no Provider boilerplate
- Selective subscriptions prevent unnecessary re-renders
- Perfect for: timeline position, camera state, selected object, UI visibility flags
- `useFrame` reads from Zustand store without triggering React renders

### Debug Controls: Leva

- React-first, hooks-based (`useControls`)
- Persists values between re-renders
- Native R3F ecosystem integration
- Agent-friendly: add debug controls with a single hook call

---

## 2. Project Structure

```
project-hail-mary/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── textures/           # Star textures, particle sprites
│   │   ├── star-sprite.png
│   │   └── glow.png
│   └── fonts/
│       └── inter-medium.woff
├── src/
│   ├── main.tsx                    # React root, mount point
│   ├── App.tsx                     # Top-level layout (Canvas + UI overlay)
│   ├── types/
│   │   ├── timeline.ts             # Timeline event types
│   │   └── scene.ts                # 3D position/waypoint types
│   ├── data/
│   │   └── timeline.json           # All timeline events (see schema below)
│   ├── stores/
│   │   ├── useTimelineStore.ts     # Timeline position, playback state
│   │   ├── useCameraStore.ts       # Active waypoint, transition state
│   │   └── useUIStore.ts           # Panel visibility, selected object
│   ├── components/
│   │   ├── canvas/                 # 3D scene components (inside <Canvas>)
│   │   │   ├── Scene.tsx           # Top-level scene composition
│   │   │   ├── SpaceEnvironment.tsx # Background stars, ambient light
│   │   │   ├── StarField.tsx       # Instanced star particles
│   │   │   ├── SunSystem.tsx       # Sol + planets (Earth departure)
│   │   │   ├── TauCetiSystem.tsx   # Tau Ceti + planets (arrival)
│   │   │   ├── Trajectory.tsx      # Flight path line/curve
│   │   │   ├── Spacecraft.tsx      # Ship position on trajectory
│   │   │   ├── WaypointMarkers.tsx # Clickable event markers along path
│   │   │   ├── Labels3D.tsx        # troika text labels in scene
│   │   │   ├── CameraRig.tsx       # Camera animation controller
│   │   │   └── Effects.tsx         # EffectComposer, Bloom, etc.
│   │   └── ui/                     # HTML overlay components (outside <Canvas>)
│   │       ├── TimelineSlider.tsx  # Scrub bar at bottom
│   │       ├── InfoPanel.tsx       # Side panel for event details
│   │       ├── NavigationBar.tsx   # Chapter/waypoint quick-jump
│   │       └── HelpOverlay.tsx     # Controls guide
│   ├── hooks/
│   │   ├── useTimeline.ts          # Timeline interpolation logic
│   │   ├── useCameraAnimation.ts   # GSAP timeline for camera flights
│   │   └── useSpacecraftPosition.ts # Map timeline → 3D position
│   ├── utils/
│   │   ├── coordinates.ts          # Light-year to scene-unit conversion
│   │   ├── easing.ts               # Custom easing curves
│   │   └── colors.ts               # Star color temperature palette
│   └── styles/
│       └── globals.css             # Base styles, overlay positioning
└── tests/
    ├── stores/                     # Unit tests for Zustand stores
    ├── utils/                      # Unit tests for coordinate math
    └── visual/                     # Playwright visual regression (optional)
```

### Architecture Principles

1. **Canvas/UI Separation:** The `<Canvas>` contains only 3D components. HTML UI components live outside `<Canvas>` and communicate via Zustand stores. This is critical for performance -- React DOM reconciliation must never interfere with the render loop.

2. **Component Granularity:** Each 3D component owns its own geometry, material, and animation logic. AI agents can modify `StarField.tsx` without understanding `Trajectory.tsx`.

3. **Data-Driven Scene:** Timeline events in JSON drive everything. Components read from stores, stores read from timeline data. No hardcoded 3D positions in component files.

4. **useFrame for Animation, React for Structure:** All per-frame mutations (position lerp, rotation, particle updates) happen in `useFrame`. React state changes are for discrete events (select object, change chapter, toggle panel).

---

## 3. Key Design Patterns

### Pattern 1: Timeline Data to 3D Position Mapping

```typescript
// src/types/timeline.ts
interface TimelineEvent {
  id: string;
  time: number;              // Normalized 0-1 across full journey
  missionDay: number;        // In-story day count
  yearEarth: number;         // Earth-frame year
  label: string;
  description: string;
  category: 'departure' | 'transit' | 'encounter' | 'arrival';
  position: {
    // Position along trajectory (0 = Earth, 1 = Tau Ceti)
    trajectoryT: number;
  };
  camera?: {
    // Optional camera waypoint override
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
}
```

```typescript
// src/utils/coordinates.ts
const EARTH_POS: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
const TAU_CETI_POS: THREE.Vector3 = new THREE.Vector3(120, 0, 0);
// 1 scene unit = 0.1 light-years; 12 ly = 120 units

export function trajectoryToWorldPos(t: number): THREE.Vector3 {
  // Could be a simple lerp or a CatmullRomCurve3 for a curved path
  return new THREE.Vector3().lerpVectors(EARTH_POS, TAU_CETI_POS, t);
}
```

### Pattern 2: Camera Rig with GSAP Waypoints

```typescript
// src/components/canvas/CameraRig.tsx
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useRef, useEffect } from 'react';
import { useCameraStore } from '../../stores/useCameraStore';

export function CameraRig() {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  const activeWaypoint = useCameraStore((s) => s.activeWaypoint);
  const tlRef = useRef<gsap.core.Timeline>();

  useEffect(() => {
    if (!activeWaypoint) return;

    // Kill any running animation
    tlRef.current?.kill();

    tlRef.current = gsap.timeline();
    tlRef.current.to(camera.position, {
      x: activeWaypoint.position[0],
      y: activeWaypoint.position[1],
      z: activeWaypoint.position[2],
      duration: 2,
      ease: 'power2.inOut',
    });
    tlRef.current.to(targetRef.current, {
      x: activeWaypoint.target[0],
      y: activeWaypoint.target[1],
      z: activeWaypoint.target[2],
      duration: 2,
      ease: 'power2.inOut',
    }, '<'); // Simultaneous with position

    return () => { tlRef.current?.kill(); };
  }, [activeWaypoint, camera]);

  useFrame(() => {
    camera.lookAt(targetRef.current);
  });

  return null; // Pure logic component, no mesh
}
```

### Pattern 3: Instanced Star Field for Performance

```typescript
// src/components/canvas/StarField.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STAR_COUNT = 10_000;

export function StarField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 500;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 500;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < STAR_COUNT; i++) {
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, STAR_COUNT]}>
      <sphereGeometry args={[0.1, 4, 4]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}
```

### Pattern 4: Selective Bloom for Star Glow

```typescript
// src/components/canvas/Effects.tsx
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';

export function Effects() {
  return (
    <EffectComposer>
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.025}
        intensity={1.5}
      />
      <ToneMapping />
    </EffectComposer>
  );
}
```

Stars that should glow use emissive materials with `toneMapped={false}`:
```tsx
<meshStandardMaterial
  emissive="#ffaa44"
  emissiveIntensity={3}
  toneMapped={false}
/>
```

### Pattern 5: Zustand Store for Timeline State

```typescript
// src/stores/useTimelineStore.ts
import { create } from 'zustand';
import type { TimelineEvent } from '../types/timeline';

interface TimelineState {
  events: TimelineEvent[];
  currentTime: number;       // 0-1 normalized
  isPlaying: boolean;
  playbackSpeed: number;

  setCurrentTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  seekToEvent: (eventId: string) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  currentTime: 0,
  isPlaying: false,
  playbackSpeed: 1,

  setCurrentTime: (t) => set({ currentTime: Math.max(0, Math.min(1, t)) }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ playbackSpeed: speed }),
  seekToEvent: (eventId) => {
    const event = get().events.find((e) => e.id === eventId);
    if (event) set({ currentTime: event.time });
  },
}));
```

### Pattern 6: HTML Overlay Layered on 3D Canvas

```typescript
// src/App.tsx
export function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Layer */}
      <Canvas
        camera={{ position: [0, 5, 20], fov: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>

      {/* HTML UI Layer - positioned absolutely over the canvas */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <TimelineSlider />  {/* pointerEvents: 'auto' on interactive elements */}
        <InfoPanel />
        <NavigationBar />
      </div>
    </div>
  );
}
```

---

## 4. Dependency List with Versions

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.0.0 | UI framework |
| `react-dom` | ^19.0.0 | DOM renderer |
| `three` | ^0.183.0 | 3D rendering engine |
| `@react-three/fiber` | ^9.5.0 | React renderer for Three.js |
| `@react-three/drei` | ^10.7.0 | Helpers: Text, Html, Stars, OrbitControls, etc. |
| `@react-three/postprocessing` | ^3.0.4 | Bloom, ToneMapping, EffectComposer |
| `gsap` | ^3.14.0 | Timeline animation, camera transitions |
| `zustand` | ^5.0.12 | State management |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.7.0 | Type safety |
| `@types/three` | ^0.183.0 | Three.js type definitions |
| `@types/react` | ^19.0.0 | React type definitions |
| `@types/react-dom` | ^19.0.0 | ReactDOM type definitions |
| `vite` | ^6.2.0 | Build tool, dev server |
| `@vitejs/plugin-react-swc` | ^3.8.0 | React Fast Refresh with SWC |
| `leva` | ^0.10.0 | Debug GUI controls |
| `vitest` | ^3.0.0 | Unit testing |
| `@react-three/test-renderer` | ^9.0.0 | Scene graph testing (experimental) |
| `eslint` | ^9.0.0 | Linting |
| `prettier` | ^3.5.0 | Code formatting |

### Install Commands

```bash
# Create project
npm create vite@latest project-hail-mary -- --template react-ts

# Core 3D dependencies
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing

# Animation and state
npm install gsap zustand

# Dev tools
npm install -D @types/three leva vitest @vitejs/plugin-react-swc
```

---

## 5. Development Workflow Optimized for AI Agents

### Principle: Small Files, Clear Contracts, Immediate Feedback

**A. File Size Rule**
Keep every file under 150 lines. AI agents work best when they can read an entire file in one pass and make targeted edits. The component-per-file structure above enforces this naturally.

**B. TypeScript as Agent Documentation**
Types replace comments. When an agent reads `TimelineEvent`, it knows exactly what data shape to expect. Prefer explicit interfaces over `any` or loose objects.

```typescript
// GOOD: Agent can read and produce correct code
interface CameraWaypoint {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  duration?: number;
  easing?: string;
}

// BAD: Agent has to guess the shape
const waypoint = { pos: [1,2,3], look: [0,0,0] };
```

**C. Data-Driven Architecture**
All scene content comes from `timeline.json`. An agent can edit the JSON to add events, adjust positions, or change labels without touching rendering code. This separates content authoring from code authoring.

**D. Debug Controls with Leva**
Every tunable parameter should have a Leva control during development. This allows an agent (or human) to iterate on values visually without code changes:

```typescript
const { bloomIntensity, starCount } = useControls('Effects', {
  bloomIntensity: { value: 1.5, min: 0, max: 5, step: 0.1 },
  starCount: { value: 10000, min: 1000, max: 50000, step: 1000 },
});
```

**E. Vite Configuration (Minimal)**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

**F. Testing Strategy**

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Vitest | Zustand stores, coordinate math, timeline interpolation |
| Scene graph | @react-three/test-renderer | Component renders correct meshes/groups |
| Visual | Playwright screenshot | Bloom renders, star field visible, no regressions |
| Manual | Leva + browser | Tweak values in real-time, verify aesthetics |

For AI agent development, unit tests on stores and utils provide the fastest feedback loop. Visual testing is useful as a safety net but slower to iterate on.

**G. Agent Development Workflow**

1. **Define data first**: Write/edit `timeline.json` with event data
2. **Build components bottom-up**: StarField -> Trajectory -> CameraRig -> Scene
3. **Use Leva for tuning**: Expose all magic numbers as controls
4. **Commit small**: One component per commit for easy rollback
5. **Test stores independently**: Zustand stores are pure functions, trivially testable
6. **Iterate visually**: `npm run dev` with hot reload for instant 3D feedback

**H. Hot Reload Considerations**

Vite's HMR works well with R3F. Key notes:
- Component state resets on HMR (expected for 3D)
- Three.js resources (geometries, materials) are auto-disposed by R3F on unmount
- GSAP timelines should be killed in cleanup effects to prevent stacking
- Zustand store state persists across HMR (intentional, useful for debugging)

---

## 6. Timeline Data Schema (JSON)

```json
{
  "metadata": {
    "title": "Project Hail Mary - Journey Timeline",
    "totalDistanceLY": 12,
    "sceneScale": 10,
    "units": "1 scene unit = 1.2 light-years"
  },
  "systems": [
    {
      "id": "sol",
      "name": "Sol System",
      "position": [0, 0, 0],
      "starColor": "#FFF4E0",
      "starRadius": 1.5
    },
    {
      "id": "tau-ceti",
      "name": "Tau Ceti System",
      "position": [120, 0, 0],
      "starColor": "#FFE4B5",
      "starRadius": 1.2
    }
  ],
  "events": [
    {
      "id": "departure",
      "time": 0.0,
      "missionDay": 0,
      "yearEarth": 2040,
      "label": "Launch from Earth",
      "description": "The Hail Mary departs Earth orbit...",
      "category": "departure",
      "position": { "trajectoryT": 0.0 },
      "camera": {
        "position": [5, 3, 10],
        "target": [0, 0, 0],
        "fov": 60
      }
    },
    {
      "id": "midpoint",
      "time": 0.5,
      "missionDay": 1095,
      "yearEarth": 2043,
      "label": "Midpoint - Maximum Velocity",
      "description": "Ship reaches peak speed...",
      "category": "transit",
      "position": { "trajectoryT": 0.5 },
      "camera": {
        "position": [60, 10, 30],
        "target": [60, 0, 0],
        "fov": 45
      }
    },
    {
      "id": "arrival",
      "time": 1.0,
      "missionDay": 2190,
      "yearEarth": 2046,
      "label": "Arrival at Tau Ceti",
      "description": "The Hail Mary enters Tau Ceti system...",
      "category": "arrival",
      "position": { "trajectoryT": 1.0 },
      "camera": {
        "position": [125, 3, 10],
        "target": [120, 0, 0],
        "fov": 60
      }
    }
  ]
}
```

---

## 7. Performance Budget

| Metric | Target | How to Achieve |
|--------|--------|---------------|
| Frame rate | 60fps (16.6ms/frame) | useFrame mutations, instanced meshes, <100 draw calls |
| Stars | 10,000+ particles | InstancedMesh (1 draw call) or Points geometry |
| Trajectory | Smooth curve | CatmullRomCurve3, ~200 segments |
| Bloom | Selective | luminanceThreshold=1, mipmapBlur, no full-scene bloom |
| DPR | 1.0-1.5 | Cap with `dpr={[1, 1.5]}` on Canvas |
| Bundle | <2MB gzipped | Tree-shaking, Draco compression if models used |
| First paint | <2s | Lazy load non-critical assets, Suspense fallbacks |

---

## 8. Why NOT the Alternatives

| Rejected Option | Reason |
|----------------|--------|
| Babylon.js | Overkill (game engine features unused), larger bundle, fewer React examples in AI training data |
| Raw Three.js | Imperative code is harder for agents to modify safely; no component boundaries |
| Next.js | SSR adds complexity with no benefit for a client-only 3D app |
| Vanilla JS | No component model, no state management, agents produce worse code |
| framer-motion for 3D | Not designed for Three.js camera/object animation |
| Redux for state | Too much boilerplate for this project size |
| dat.gui / lil-gui | Not React-native; Leva is the R3F ecosystem standard |
| JavaScript (no TS) | Agents produce more bugs without type checking |

---

## Sources

- [Babylon.js vs React Three Fiber - Aircada](https://aircada.com/blog/babylon-js-vs-react-three-fiber)
- [Babylon.js vs Three.js - DEV Community](https://dev.to/devin-rosario/babylonjs-vs-threejs-choosing-the-right-3d-framework-for-long-term-team-scalability-col)
- [Three.js vs Babylon.js vs PlayCanvas Comparison 2026](https://www.utsubo.com/blog/threejs-vs-babylonjs-vs-playcanvas-comparison)
- [React Three Fiber Documentation](https://r3f.docs.pmnd.rs/)
- [R3F Installation Guide](https://r3f.docs.pmnd.rs/getting-started/installation)
- [100 Three.js Tips 2026](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Building Efficient Three.js Scenes - Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- [Cinematic 3D Scroll Experiences with GSAP - Codrops](https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/)
- [Animating Camera Transitions with GSAP](https://waelyasmina.net/articles/animating-camera-transitions-in-three-js-using-gsap/)
- [Bloom - React Postprocessing Docs](https://react-postprocessing.docs.pmnd.rs/effects/bloom)
- [Troika Three Text](https://protectwise.github.io/troika/troika-three-text/)
- [Drei Text Component](https://drei.docs.pmnd.rs/abstractions/text)
- [Leva - GitHub](https://github.com/pmndrs/leva)
- [Zustand State Management 2025](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m)
- [GSAP - GitHub (License Info)](https://github.com/greensock/GSAP)
- [R3F vs Three.js in 2026](https://graffersid.com/react-three-fiber-vs-three-js/)
- [What's New in Three.js 2026](https://www.utsubo.com/blog/threejs-2026-what-changed)
- [How Good Is AI at Coding React - Addy Osmani](https://addyo.substack.com/p/how-good-is-ai-at-coding-react-really)
- [Three.js Particles - Varun Vachhar](https://varun.ca/three-js-particles/)
- [Galaxy Particles with Three.js - Codrops](https://tympanus.net/codrops/2022/06/21/creating-a-particles-galaxy-with-three-js/)
- [Vite R3F TypeScript Template - GitHub](https://github.com/pachoclo/vite-r3f-ts-template)
- [@react-three/test-renderer - npm](https://www.npmjs.com/package/@react-three/test-renderer)
- [Vitest Visual Regression Testing](https://vitest.dev/guide/browser/visual-regression-testing)
