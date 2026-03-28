# Project Hail Mary - Interactive 3D Space-Time Visualization

An interactive WebGL visualization of the novel *Project Hail Mary* (挽救计划) by Andy Weir, depicting protagonist Ryland Grace's journey through the cosmos in a navigable 3D space-time environment.

## Overview

This project transforms the story's timeline into an explorable 3D scene. The viewer travels with Grace from Earth through interstellar space to the Tau Ceti system, witnesses his encounter with Rocky, and follows his ultimate journey to 40 Eridani. Every major event is mapped to a spatial position within its scene's coordinate frame and connected through an animated flight trajectory.

### Key Features

- **3D Star Field** -- Nearby stars within ~50 light-years, rendered as glowing particles with temperature-based colors
- **Animated Flight Trajectory** -- Grace's path from Sol to Tau Ceti to 40 Eridani, rendered as a luminous curve through space
- **Non-Linear Timeline Scrubber** -- Scrub through story progress with semantic time compression; all 3D state derives from the current position
- **Event Markers** -- 85+ key events placed along the trajectory with descriptions, chapter references, and scene context
- **Dual Timeline** -- Toggle between narrative order (with flashbacks) and true chronological order; two projections over the same event graph
- **Multi-Scale Scenes** -- Seamless transitions between interstellar view, star-system view, ship encounter view, and surface view
- **Camera Cinematics** -- Camera state is a pure function of timeline position; GSAP used only for jump smoothing and autoplay
- **Interactive Orbit** -- Free orbit/zoom when the timeline is paused, explore each scene at your own pace
- **Bloom Post-Processing** -- Stars and engine exhaust glow with physically-inspired bloom effects

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Rendering | React Three Fiber 9 + Drei 10 | Declarative 3D, agent-friendly component model |
| Animation | GSAP 3.14 (scoped) | Jump smoothing, autoplay transitions, UI motion only |
| State | Zustand 5 | Canonical timeline state, camera state, UI state |
| Validation | Zod | Schema validation for timeline data |
| Post-processing | @react-three/postprocessing | Selective bloom, tone mapping |
| Text (3D) | Drei `<Text>` (troika-three-text) | SDF rendering, GPU-accelerated |
| Framework | Vite 6 + React 19 + TypeScript 5.7 | Fast HMR, type safety, AI-optimized |
| Debug | Leva | Runtime parameter tuning |

## Core Architecture

### Multi-Scale Coordinate Frames

The visualization uses **4 coordinate frames** to handle the 15-order-of-magnitude scale range (light-years to meters):

| Frame | Scale | Usage | Near/Far |
|-------|-------|-------|----------|
| `interstellar` | 1 unit = 1 ly | Star field, full trajectory overview | 0.01 / 500 |
| `system` | 1 unit = 0.01 AU | Star system scenes (Sol, Tau Ceti, 40 Eridani) | 0.001 / 100 |
| `encounter` | 1 unit = 1 m | Ship-to-ship (217m), EVA, tunnel | 0.1 / 1000 |
| `surface` | 1 unit = 1 m | Planet surface, habitat dome | 0.1 / 5000 |

Each scene references its coordinate frame. Frame transitions are **animated cuts with visual dressing** (fade-to-black or crossfade), not continuous spatial zooms. The 3D scene graph is fully replaced when the frame changes; there is no attempt to continuously rescale between light-years and meters.

### Data Model

The timeline uses **4 entity types**, not just point events:

| Type | Purpose | Example |
|------|---------|---------|
| `Event` | Instantaneous milestone | "Grace discovers Astrophage" |
| `Segment` | Interval with start/end, carries `progressWeight` for time compression | "Interstellar transit (4 years, low weight)" |
| `Scene` | Rendering context + coordinate frame | "Tau Ceti System" |
| `CameraShot` | Camera behavior anchored to `chronologicalTime` (projection-independent) | "Pull back from Earth to orbit" |

### Timeline Model

Events carry **two time axes**:
- `chronologicalTime` -- monotonic physical story time (days from Petrova discovery). This is the **stable anchor** for all data entities.
- `narrativeIndex` -- chapter/section presentation order

Segments carry a `progressWeight` field that controls how much scrubber-space they occupy (low weight = compressed transit, high weight = dense event clusters). The scrubber operates on **story progress** (non-linear) by default. The dual-timeline toggle swaps the ordering projection, not the data. CameraShots are anchored to `chronologicalTime` ranges, making them projection-independent.

### Camera State

Camera state is a **pure function of timeline position**:
- Scrubbing: position/rotation/FOV interpolated from keyframe table
- Autoplay/jump: GSAP smooths the transition, then hands back to the interpolation function
- Paused: CameraControls for free orbit; resumes from current position on play

## Project Structure

```
src/
├── data/
│   ├── timeline.json           # Events, segments, scenes, camera shots
│   └── stars.json              # Nearby star catalog (positions, types)
├── schema/
│   └── timeline.schema.ts      # Zod schemas + validation
├── types/
│   ├── timeline.ts             # Event, Segment, Scene, CameraShot
│   ├── coordinates.ts          # CoordinateFrame, FrameTransform
│   └── camera.ts               # CameraKeyframe, CameraMode
├── stores/
│   ├── useTimelineStore.ts     # Story progress, playback, active event
│   ├── useSceneStore.ts        # Active scene, coordinate frame, near/far
│   └── useUIStore.ts           # Panel visibility, selected event
├── engine/
│   ├── timeMapping.ts          # Non-linear time ↔ progress mapping
│   ├── cameraInterpolation.ts  # Pure function: progress → camera state
│   └── coordinateFrames.ts     # Frame definitions and transforms
├── components/
│   ├── canvas/                 # 3D components (inside <Canvas>)
│   │   ├── SceneRouter.tsx     # Renders active scene based on store
│   │   ├── scenes/             # One component per scene (7 scenes)
│   │   │   ├── EarthDepartureScene.tsx   # Sol system, launch
│   │   │   ├── InterstellarScene.tsx     # Star field, transit
│   │   │   ├── TauCetiScene.tsx          # Tau Ceti system, orbit
│   │   │   ├── EncounterScene.tsx        # Ship-to-ship, Rocky
│   │   │   ├── AdrianScene.tsx           # Sampling, Taumoeba
│   │   │   ├── RescueScene.tsx           # Beetle launch, search
│   │   │   └── EridianScene.tsx          # 40 Eridani, settlement
│   │   ├── StarField.tsx       # Instanced stars (baked once, shader-animated)
│   │   ├── Trajectory.tsx      # Multi-path flight curve
│   │   ├── Spacecraft.tsx      # Ship on trajectory
│   │   ├── CameraRig.tsx       # Pure interpolation + GSAP smoothing
│   │   ├── Labels.tsx          # Priority-based, scale-aware labels
│   │   └── Effects.tsx         # Bloom, tone mapping
│   └── ui/                     # HTML overlay (outside <Canvas>)
│       ├── TimelineSlider.tsx  # Non-linear scrub bar + controls
│       ├── InfoPanel.tsx       # Event details panel
│       └── ChapterNav.tsx      # Chapter/scene quick-jump
├── hooks/
│   ├── useStoryProgress.ts    # Progress → active events/segments
│   └── useSceneTransition.ts  # Scene switch animation
└── utils/
    ├── colors.ts               # Star temperature → color
    └── easing.ts               # Custom easing curves
```

## Design References

- [Google 100,000 Stars](https://stars.chromeexperiments.com/) -- multi-scale star visualization, tour mode
- [NASA Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/) -- time scrubber + 3D trajectory
- [Spacekit.js](https://typpo.github.io/spacekit/) -- open-source space viz library
- [Codrops Camera Fly-Through](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/) -- scroll-driven camera animation

## Architecture Principles

1. **Time is the single source of truth** -- camera, positions, labels all derive from story progress via pure functions
2. **Multi-scale coordinate frames** -- each scene owns its coordinate frame; no single global scale
3. **Canvas/UI separation** -- 3D in `<Canvas>`, HTML overlay via absolute positioning, bridged by Zustand
4. **Data-driven** -- edit `timeline.json` to add events without touching render code; Zod validates on load
5. **Events + Segments + Scenes** -- not just point events; intervals and rendering contexts are first-class
6. **GSAP is not the source of truth** -- Zustand holds canonical state; GSAP smooths transitions only
7. **One responsibility per module** -- clear interfaces over arbitrary line limits
8. **useFrame for animation, React for structure** -- per-frame mutations in `useFrame`, React state for discrete events

## Getting Started

```bash
npm install
npm run dev     # → http://localhost:5173
```

## License

MIT
