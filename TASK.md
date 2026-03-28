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
- [x] Codex review round 2 (2 MAJOR, 2 MEDIUM resolved)
- [x] User confirmation

---

## Phase 1: Data Schema & Engine Core

### M1.1 - Project Bootstrap
- [x] `npm create vite@latest` with react-ts template
- [x] Install core deps (three, R3F, drei, postprocessing, gsap, zustand, zod)
- [x] Install dev deps (leva, vitest, @types/three)
- [x] Configure vite.config.ts, tsconfig.json
- [x] Create base App.tsx with `<Canvas>` placeholder
- [x] Verify dev server starts

### M1.2 - Data Schema & Validation
- [x] Define Zod schema: CoordinateFrame enum
- [x] Define Zod schema: Event (id, chronologicalTime, narrativeIndex, chapter, sceneId, frameId, position, actors, description, importance)
- [x] Define Zod schema: Segment (id, startTime, endTime, sceneId, frameId, progressWeight, interpolation)
- [x] Define Zod schema: Scene (id, frameId, visibleBodies, labelConfig, nearFar)
- [x] Define Zod schema: CameraShot (id, sceneId, startChronoTime, endChronoTime, keyframes[]) -- anchored to chronologicalTime, NOT storyProgress
- [x] Generate TypeScript types from Zod schemas
- [x] Write timeline.json: 85 events with all required fields
- [x] Write timeline.json: segments with progressWeight (transit=low, dense events=high)
- [x] Write timeline.json: 7 scenes (EarthDeparture, Interstellar, TauCeti, Encounter, Adrian, Rescue, Eridian)
- [x] Write timeline.json: camera shots anchored to chronologicalTime for all scenes
- [x] Validation pipeline: loadTimeline() → Zod parse → typed data
- [x] Unit tests: valid data passes, invalid data fails with clear errors
- [x] Unit tests: event ordering (chronological monotonic)
- [x] Unit tests: every event references a valid scene

### M1.3 - Coordinate Frame Architecture
- [x] Define CoordinateFrame configs: interstellar (1u=1ly, near=0.01, far=500)
- [x] Define CoordinateFrame configs: system (1u=0.01AU, near=0.001, far=100)
- [x] Define CoordinateFrame configs: encounter (1u=1m, near=0.1, far=1000)
- [x] Define CoordinateFrame configs: surface (1u=1m, near=0.1, far=5000)
- [x] Frame transform utilities (position transform between frames)
- [x] Unit tests: round-trip transforms, edge cases

### M1.4 - Timeline Engine
- [x] Non-linear progress mapping: storyProgress(0-1) ↔ chronologicalTime (driven by Segment.progressWeight)
- [x] Progress mapping reads progressWeight from segment data (no hardcoded compression rules)
- [x] Segments with low progressWeight compress transit; high progressWeight expand dense phases
- [x] Zustand store: storyProgress, chronologicalTime, isPlaying, playbackSpeed
- [x] Dual timeline: narrativeOrder vs chronologicalOrder as projections
- [x] resolveActiveState(progress) → { activeEvents, activeSegments, activeScene }
- [x] Unit tests: progress mapping, event resolution, ordering toggle

### M1.5 - Camera Interpolation Engine
- [x] CameraKeyframe type: { progress, position, target, fov, easing }
- [x] Pure function: interpolateCamera(progress, keyframes[]) → CameraState
- [x] CatmullRomCurve3 for position path, quaternion slerp for rotation
- [x] GSAP smoothing wrapper: smoothSeek(fromProgress, toProgress) → animation
- [x] CameraControls integration: handoff to orbit when paused, resume on play
- [x] Unit tests: interpolation correctness, boundary conditions

---

## Phase 2: Minimal Visual Slice

### M2.1 - Scene Infrastructure
- [x] SceneRouter.tsx: conditionally render scene by activeScene from store
- [x] Canvas config: dynamic near/far from active coordinate frame
- [x] Scene transition: fade-to-black between frame switches

### M2.2 - Interstellar Scene
- [x] StarField.tsx: InstancedMesh with baked matrices (set once in useEffect)
- [x] Star color: temperature mapping in shader (vertex color attribute)
- [x] Star twinkle: shader-driven opacity animation (no JS per-frame updates)
- [x] Key stars: Sol, Tau Ceti, 40 Eridani as larger labeled spheres
- [x] Trajectory.tsx: CatmullRomCurve3, multi-path (Sol→TC, TC→40Eri)
- [x] Spacecraft.tsx: cone on curve, position = f(storyProgress)

### M2.3 - Timeline UI
- [x] TimelineSlider.tsx: non-linear scrub bar, event markers
- [x] Play/pause, speed controls (1x/10x/100x)
- [x] Current event label + mission day/year display
- [x] Keyboard shortcuts (arrows, spacebar)
- [x] Chapter/scene markers for quick jump

### M2.4 - Camera Rig
- [x] CameraRig.tsx: reads progress, calls interpolateCamera, applies to camera
- [x] GSAP smoothing on seekToEvent jumps
- [x] CameraControls handoff when paused
- [x] Verify: forward, reverse, rapid seek, timeline toggle

### M2.5 - Post-Processing
- [x] Effects.tsx: EffectComposer, Bloom, ToneMapping
- [x] Selective bloom (emissive >1 on stars/trajectory)
- [x] Leva controls for tuning

**Gate: full vertical slice works**

---

## Phase 2.5: User Feedback Fixes

- [x] Multi-segment trajectory with story-accurate path (outbound/return/rescue/reunion)
- [x] Each segment has distinct color (blue #4488ff / cyan #44ddff / red #ff6644 / gold #ffaa33)
- [x] Separation and reunion point markers with glow animation
- [x] Iconic markers: Earth (blue sphere+ring at Sol), Target A (orange, follows own path)
- [x] Ship scale increased 0.15 → 0.3 for visibility
- [x] Billboard labels: text always faces camera via Drei Billboard
- [x] Dual damping camera: PLAYING_DAMP=8 (fast tracking), PAUSED_DAMP=4 (smooth orbit)
- [x] CameraControls replaces OrbitControls for smooth scroll wheel interpolation
- [x] Camera recenter button (R key) with smooth CameraControls.setLookAt transition
- [x] Playback slowed: BASE_RATE 1/60 → 1/120 (120s full playback at 1x)
- [x] Manual event navigation: prev/next buttons (⏮/⏭) with J/K keys and Alt+arrows
- [x] Floating EventSynopsis: glassmorphism Html cards at event 3D positions
- [x] StatusPanel: left-side metrics (distance, mission day, fuel, characters, chapter)
- [x] HelpOverlay updated with all new shortcuts

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
- [ ] Frame cut (fade-to-black) between interstellar and encounter

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
