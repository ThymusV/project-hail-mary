# Project Hail Mary - Interactive 3D Space-Time Visualization

An interactive WebGL visualization of the novel *Project Hail Mary* (挽救计划) by Andy Weir, depicting protagonist Ryland Grace's journey through the cosmos in a navigable 3D space-time environment.

## Overview

This project transforms the story's timeline into an explorable 3D scene. The viewer travels with Grace from Earth through interstellar space to the Tau Ceti system, witnesses his encounter with Rocky, and follows his ultimate journey to 40 Eridani. Every major event is mapped to a spatial position and connected through an animated flight trajectory.

### Key Features

- **3D Star Field** -- Accurate positions of nearby stars within ~50 light-years, rendered as glowing particles with temperature-based colors
- **Animated Flight Trajectory** -- Grace's path from Sol to Tau Ceti to 40 Eridani, rendered as a luminous curve through space
- **Timeline Scrubber** -- Drag through the entire story chronologically; all 3D state (camera, spacecraft position, labels) derives from the current time
- **Event Markers** -- 85+ key events placed along the trajectory with descriptions, chapter references, and scene context
- **Dual Timeline** -- Toggle between the story's narrative order (with flashbacks) and true chronological order
- **Camera Cinematics** -- Smooth GSAP-driven camera transitions between waypoints: Earth departure, interstellar transit, Tau Ceti arrival, Rocky encounter, rescue mission, 40 Eridani settlement
- **Interactive Orbit** -- Free orbit/zoom when the timeline is paused, explore each scene at your own pace
- **Bloom Post-Processing** -- Stars and engine exhaust glow with physically-inspired bloom effects

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Rendering | React Three Fiber 9 + Drei 10 | Declarative 3D, agent-friendly component model |
| Animation | GSAP 3.14 | Timeline sequencing, camera flights, scrubber binding |
| State | Zustand 5 | Minimal, hooks-based, same ecosystem as R3F |
| Post-processing | @react-three/postprocessing | Selective bloom, tone mapping |
| Text (3D) | Drei `<Text>` (troika-three-text) | SDF rendering, GPU-accelerated |
| Framework | Vite 6 + React 19 + TypeScript 5.7 | Fast HMR, type safety, AI-optimized |
| Debug | Leva | Runtime parameter tuning |

## Story Data

The visualization is driven by `src/data/timeline.json`, which contains:
- 85 chronological events with mission days, Earth years, spatial positions, and camera waypoints
- 7 major characters and 20+ supporting roles
- 30+ Earth locations, 6 spacecraft, 15+ celestial bodies
- Scientific data: star distances, Astrophage properties, ship specifications

## Getting Started

```bash
npm install
npm run dev     # → http://localhost:5173
```

## Project Structure

```
src/
├── data/timeline.json          # All story events (data-driven)
├── types/                      # TypeScript interfaces
├── stores/                     # Zustand stores (timeline, camera, UI)
├── components/
│   ├── canvas/                 # 3D components (inside <Canvas>)
│   │   ├── Scene.tsx           # Top-level composition
│   │   ├── StarField.tsx       # 10K instanced star particles
│   │   ├── Trajectory.tsx      # Flight path curve
│   │   ├── Spacecraft.tsx      # Ship on trajectory
│   │   ├── CameraRig.tsx       # GSAP camera controller
│   │   └── Effects.tsx         # Bloom, tone mapping
│   └── ui/                     # HTML overlay (outside <Canvas>)
│       ├── TimelineSlider.tsx   # Scrub bar + controls
│       ├── InfoPanel.tsx        # Event details
│       └── NavigationBar.tsx    # Chapter quick-jump
├── hooks/                      # Timeline interpolation, camera animation
└── utils/                      # Coordinate math, easing, colors
```

## Design References

- [Google 100,000 Stars](https://stars.chromeexperiments.com/) -- multi-scale star visualization, tour mode
- [NASA Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/) -- time scrubber + 3D trajectory
- [Spacekit.js](https://typpo.github.io/spacekit/) -- open-source space viz library
- [Codrops Camera Fly-Through](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/) -- scroll-driven camera animation

## Architecture Principles

1. **Time is the single source of truth** -- camera, positions, labels all derive from `currentTime`
2. **Canvas/UI separation** -- 3D in `<Canvas>`, HTML overlay via absolute positioning, bridged by Zustand
3. **Data-driven** -- edit `timeline.json` to add events without touching render code
4. **Files under 150 lines** -- one component per file for agent readability
5. **useFrame for animation, React for structure** -- per-frame mutations in `useFrame`, React state for discrete events

## License

MIT
