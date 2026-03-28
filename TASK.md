# Task Tracker

## Status Legend
- [ ] Pending
- [~] In Progress
- [x] Completed

---

## Phase 0: Foundation

### Research & Data Extraction
- [x] Read complete book text and extract timeline events
- [x] Catalog all characters, locations, celestial bodies
- [x] Map chronological vs narrative order for all 31 chapters
- [x] Extract scientific data (distances, speeds, ship specs, Astrophage properties)
- [x] Document spatial journey trajectory (Sol → Tau Ceti → 40 Eridani)

### Design Research
- [x] Survey WebGL space visualization references (14 projects)
- [x] Analyze interaction models (timeline scrubber, camera systems)
- [x] Define visual style (color palette, rendering approach, post-processing)

### Technical Research
- [x] Evaluate 3D frameworks (R3F selected)
- [x] Evaluate animation approaches (GSAP selected, scoped to smoothing)
- [x] Define project structure and architecture patterns

### Architecture Review
- [x] Write README, ROADMAP, TASK
- [x] Codex review round 1 (4 CRITICAL issues found)
- [x] Fix: multi-scale coordinate frames
- [x] Fix: rich data model (Event + Segment + Scene + CameraShot)
- [x] Fix: non-linear time mapping with dual timeline
- [x] Fix: camera as pure function of progress
- [x] Fix: reorder phases (data → engine → visuals)
- [~] Codex review round 2
- [ ] User confirmation

---

## Phase 1: Data Schema & Engine Core

### M1.1 - Project Bootstrap
- [ ] `npm create vite@latest` with react-ts template
- [ ] Install core deps (three, R3F, drei, postprocessing, gsap, zustand, zod)
- [ ] Install dev deps (leva, vitest, @types/three)
- [ ] Configure vite.config.ts, tsconfig.json
- [ ] Create base App.tsx with `<Canvas>` placeholder
- [ ] Verify dev server starts

### M1.2 - Data Schema & Validation
- [ ] Define Zod schema: CoordinateFrame enum
- [ ] Define Zod schema: Event (id, chronologicalTime, narrativeIndex, chapter, sceneId, frameId, position, actors, description, importance)
- [ ] Define Zod schema: Segment (id, startTime, endTime, sceneId, frameId, interpolation)
- [ ] Define Zod schema: Scene (id, frameId, visibleBodies, labelConfig, nearFar)
- [ ] Define Zod schema: CameraShot (id, sceneId, startProgress, endProgress, keyframes[])
- [ ] Generate TypeScript types from Zod schemas
- [ ] Write timeline.json: 85 events with all required fields
- [ ] Write timeline.json: transit/encounter/breeding segments
- [ ] Write timeline.json: 7 scenes with coordinate frames
- [ ] Write timeline.json: camera shots for all scenes
- [ ] Validation pipeline: loadTimeline() → Zod parse → typed data
- [ ] Unit tests: valid data passes, invalid data fails with clear errors
- [ ] Unit tests: event ordering (chronological monotonic)
- [ ] Unit tests: every event references a valid scene

### M1.3 - Coordinate Frame Architecture
- [ ] Define CoordinateFrame configs: interstellar (1u=1ly, near=0.01, far=500)
- [ ] Define CoordinateFrame configs: system (1u=0.01AU, near=0.001, far=100)
- [ ] Define CoordinateFrame configs: encounter (1u=1m, near=0.1, far=1000)
- [ ] Define CoordinateFrame configs: surface (1u=1m, near=0.1, far=5000)
- [ ] Frame transform utilities (position transform between frames)
- [ ] Unit tests: round-trip transforms, edge cases

### M1.4 - Timeline Engine
- [ ] Non-linear progress mapping: storyProgress(0-1) ↔ chronologicalTime
- [ ] Semantic compression: transit phases get less progress-space per time-unit
- [ ] Dense event phases get more progress-space per time-unit
- [ ] Zustand store: storyProgress, chronologicalTime, isPlaying, playbackSpeed
- [ ] Dual timeline: narrativeOrder vs chronologicalOrder as projections
- [ ] resolveActiveState(progress) → { activeEvents, activeSegments, activeScene }
- [ ] Unit tests: progress mapping, event resolution, ordering toggle

### M1.5 - Camera Interpolation Engine
- [ ] CameraKeyframe type: { progress, position, target, fov, easing }
- [ ] Pure function: interpolateCamera(progress, keyframes[]) → CameraState
- [ ] CatmullRomCurve3 for position path, quaternion slerp for rotation
- [ ] GSAP smoothing wrapper: smoothSeek(fromProgress, toProgress) → animation
- [ ] CameraControls integration: handoff to orbit when paused, resume on play
- [ ] Unit tests: interpolation correctness, boundary conditions

---

## Phase 2: Minimal Visual Slice

### M2.1 - Scene Infrastructure
- [ ] SceneRouter.tsx: conditionally render scene by activeScene from store
- [ ] Canvas config: dynamic near/far from active coordinate frame
- [ ] Scene transition: fade-to-black between frame switches

### M2.2 - Interstellar Scene
- [ ] StarField.tsx: InstancedMesh with baked matrices (set once in useEffect)
- [ ] Star color: temperature mapping in shader (vertex color attribute)
- [ ] Star twinkle: shader-driven opacity animation (no JS per-frame updates)
- [ ] Key stars: Sol, Tau Ceti, 40 Eridani as larger labeled spheres
- [ ] Trajectory.tsx: CatmullRomCurve3, multi-path (Sol→TC, TC→40Eri)
- [ ] Spacecraft.tsx: cone on curve, position = f(storyProgress)

### M2.3 - Timeline UI
- [ ] TimelineSlider.tsx: non-linear scrub bar, event markers
- [ ] Play/pause, speed controls (1x/10x/100x)
- [ ] Current event label + mission day/year display
- [ ] Keyboard shortcuts (arrows, spacebar)
- [ ] Chapter/scene markers for quick jump

### M2.4 - Camera Rig
- [ ] CameraRig.tsx: reads progress, calls interpolateCamera, applies to camera
- [ ] GSAP smoothing on seekToEvent jumps
- [ ] CameraControls handoff when paused
- [ ] Verify: forward, reverse, rapid seek, timeline toggle

### M2.5 - Post-Processing
- [ ] Effects.tsx: EffectComposer, Bloom, ToneMapping
- [ ] Selective bloom (emissive >1 on stars/trajectory)
- [ ] Leva controls for tuning

**Gate: full vertical slice works**

---

## Phase 3: Remaining Scenes

### M3.1 - Sol System Scene
- [ ] Sun sphere with glow
- [ ] Earth with basic texture
- [ ] ISS marker
- [ ] Petrova line (IR curve)
- [ ] Launch animation

### M3.2 - Tau Ceti Scene
- [ ] Tau Ceti star
- [ ] Adrian planet with atmosphere rim
- [ ] Planetary orbit indicators

### M3.3 - Encounter Scene
- [ ] Hail Mary model (47m cylinder)
- [ ] Target A model (139m triangular)
- [ ] Connection tunnel geometry
- [ ] 217m scale scene

### M3.4 - Rescue Scene
- [ ] Beetle probe launch (4 trajectories)
- [ ] Radar sweep visualization
- [ ] Turnaround + approach trajectory
- [ ] Frame transition: encounter → interstellar → encounter

### M3.5 - 40 Eridani Scene
- [ ] Triple star system
- [ ] Eridian b planet
- [ ] Habitat dome (surface frame)

### M3.6 - Info Panel & Labels
- [ ] InfoPanel.tsx: slide-in, event details, chapter, characters
- [ ] Priority-based label rendering (importance field from schema)
- [ ] Scale-aware label visibility (fade by distance)
- [ ] Simple collision avoidance (offset)

**Gate: all scenes + transitions work end-to-end**

---

## Phase 4: Polish

### Visual
- [ ] Planet PBR textures
- [ ] Custom star shaders
- [ ] Engine exhaust particles
- [ ] Astrophage swarm particles
- [ ] Vignette + film grain
- [ ] Loading screen

### Navigation
- [ ] ChapterNav.tsx (quick-jump)
- [ ] Dual timeline toggle UI
- [ ] URL hash state
- [ ] 2D mini-map (optional)

### Performance
- [ ] Render-on-demand (frameloop="demand")
- [ ] Star field LOD per scene
- [ ] Lazy texture loading
- [ ] Mobile optimization (DPR cap, reduced particles)
- [ ] Profiling pass (target: 60fps)

---

## Backlog / Stretch
- [ ] Astrophage infection chain map
- [ ] Taumoeba evolution timeline
- [ ] Ship schematic overlay
- [ ] Audio narration
- [ ] Eridian language visualization
- [ ] Gaia DR3 real star data
- [ ] i18n (Chinese + English)
