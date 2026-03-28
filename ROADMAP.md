# Roadmap & Milestones

## Vision

Build a browser-based interactive 3D space-time visualization of *Project Hail Mary* that lets viewers experience the protagonist's interstellar journey as a navigable, cinematic timeline.

---

## Phase 0: Foundation (Current)
**Status: In Progress**

### M0.1 - Research & Planning (DONE)
- [x] Extract complete book timeline (85 events, 7 characters, 30+ locations)
- [x] Survey design references (14 projects analyzed, 4 tier-1 references)
- [x] Evaluate tech stack (R3F + GSAP + Zustand selected)
- [x] Define project architecture and component structure
- [x] Create project documents (README, ROADMAP, TASK)

### M0.2 - Architecture Review & Finalization
- [x] Codex review round 1 -- identified 4 critical issues
- [x] Fix: multi-scale coordinate frames (interstellar/system/encounter/surface)
- [x] Fix: rich data model (Event + Segment + Scene + CameraShot)
- [x] Fix: non-linear time mapping with dual timeline projections
- [x] Fix: camera as pure function of progress, GSAP scoped to smoothing
- [x] Fix: reorder phases (data → engine → visuals)
- [x] Codex review round 2 -- 0 critical, 2 major + 2 medium resolved
- [ ] User confirmation of final plan

---

## Phase 1: Data Schema & Engine Core
**Goal: Solid data foundation and timeline engine before any visuals**

### M1.1 - Project Bootstrap
- Vite + React 19 + TypeScript project setup
- Install all dependencies
- Configure Vite, TypeScript, ESLint
- Minimal App.tsx (just a black Canvas placeholder)

### M1.2 - Data Schema & Validation
- Define Zod schemas for: Event, Segment, Scene, CameraShot, CoordinateFrame
- Segment schema includes `progressWeight` (controls scrubber compression per segment)
- CameraShot anchored to `chronologicalTime` ranges (projection-independent)
- Define TypeScript interfaces derived from Zod schemas
- Write `timeline.json` with all 85 events + segments + 7 scenes
- Validation pipeline: load JSON → Zod parse → typed data
- Unit tests: schema validation, event ordering, scene coverage, progressWeight normalization

### M1.3 - Coordinate Frame Architecture
- Define 4 frames: interstellar (1u=1ly), system (1u=0.01AU), encounter (1u=1m), surface (1u=1m)
- Frame transform utilities (compose, decompose)
- Per-frame near/far plane configuration
- Unit tests: coordinate transforms between frames

### M1.4 - Timeline Engine
- Non-linear time ↔ story progress mapping (semantic compression for transit phases)
- Zustand store: storyProgress (0-1), chronologicalTime, isPlaying, playbackSpeed
- Dual timeline: chronological vs narrative ordering as two projections
- Progress → active events/segments/scene resolution
- Unit tests: time mapping, event resolution, ordering

### M1.5 - Camera Interpolation Engine
- Camera keyframe table (per scene, per event)
- Pure function: storyProgress → { position, target, fov }
- CatmullRomCurve3 for position paths, quaternion slerp for rotation
- GSAP integration for jump smoothing only (not source of truth)
- CameraControls for free orbit when paused
- Unit tests: interpolation, edge cases

---

## Phase 2: Minimal Visual Slice
**Goal: One working scene with scrubber, proving the full vertical stack**

### M2.1 - Scene Infrastructure
- SceneRouter.tsx: renders active scene component based on store
- Frame-dependent Canvas config (near/far, background)
- Scene transition animations (fade/cut)

### M2.2 - Interstellar Scene (first scene)
- StarField.tsx: 10K stars, baked InstancedMesh (no per-frame matrix updates), shader-driven twinkle
- Key stars (Sol, Tau Ceti, 40 Eridani) as labeled larger objects
- Trajectory curve (CatmullRomCurve3, multi-segment: Sol→TauCeti→40Eridani)
- Spacecraft marker on curve driven by progress

### M2.3 - Timeline UI
- TimelineSlider.tsx: non-linear scrub bar at bottom
- Event marker dots (clickable, priority-filtered)
- Play/pause, speed controls (1x/10x/100x)
- Current event label + mission day display
- Keyboard: arrows for scrub, spacebar for play/pause

### M2.4 - Camera Rig
- CameraRig.tsx: reads progress from store, outputs interpolated camera state
- GSAP smoothing on jumps (seekToEvent)
- CameraControls handoff when paused
- Verify: forward scrub, reverse scrub, rapid seek, timeline toggle all work

### M2.5 - Bloom Post-Processing
- EffectComposer with selective Bloom (luminanceThreshold=1, mipmapBlur)
- Stars glow, UI does not
- Leva controls for tuning

**Milestone gate: full vertical slice works — scrub, camera, scene, labels, bloom**

---

## Phase 3: Remaining Scenes
**Goal: All 6 scenes implemented with scene transitions**

### M3.1 - Sol System Scene (frame: system)
- Sun + Earth with basic texture
- ISS marker in orbit
- Petrova line visualization
- Launch trajectory animation

### M3.2 - Tau Ceti Scene (frame: system)
- Tau Ceti star + planetary orbits
- Adrian planet with atmosphere rim glow
- Orbit-level view of events

### M3.3 - Encounter Scene (frame: encounter)
- Rocky's ship (Target A): 139m triangular geometry
- Hail Mary: 47m cylindrical geometry
- Connection tunnel between ships (217m distance)
- Sampling chain descent to Adrian (91km)

### M3.4 - Rescue Scene (frame: interstellar → encounter)
- Beetle probe launch trajectories (4 probes)
- Search radar sweep visualization
- Grace's turnaround + approach to disabled Target A
- Frame cut (fade-to-black) from interstellar to encounter for rescue approach

### M3.5 - 40 Eridani Scene (frame: system → surface)
- Triple star system (40 Eridani A/B/C)
- Eridian b planet
- Habitat dome on surface (surface frame)

### M3.6 - Info Panel & Labels
- InfoPanel.tsx: slide-in with event details, chapter, characters
- Priority-based label rendering (importance field)
- Scale-aware visibility: labels fade at inappropriate distances
- Label collision avoidance (simple offset strategy)

**Milestone gate: all scenes render, transitions work, scrubber navigates full story**

---

## Phase 4: Polish & Interaction
**Goal: Cinematic quality and smooth UX**

### M4.1 - Visual Polish
- Planet PBR textures
- Custom star glow shaders
- Engine exhaust particles
- Astrophage swarm particles at Petrova line
- Vignette + subtle film grain
- Loading screen

### M4.2 - Navigation
- ChapterNav.tsx: chapter/scene quick-jump bar
- Dual timeline toggle (narrative vs chronological)
- URL hash state for shareability
- 2D mini-map (optional)

### M4.3 - Performance
- Render-on-demand (frameloop="demand" + invalidation)
- Star field LOD by scene
- Lazy texture loading
- Mobile: DPR cap, reduced particles, simplified bloom
- Performance profiling pass (target: 60fps mid-range hardware)

---

## Phase 5: Content & Extras (Stretch)
- Astrophage infection chain (star-to-star propagation map)
- Taumoeba evolution timeline (breeding generations)
- Ship schematic overlay (book's actual diagrams)
- Audio narration triggers at key events
- Eridian harmonic language visualization
- Real Gaia DR3 star positions
- i18n (Chinese + English)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | R3F + Drei | Declarative, agent-friendly, same performance as raw Three.js |
| Animation | GSAP (scoped) | Jump smoothing only; Zustand is source of truth for camera |
| State | Zustand | Canonical state for timeline, camera, UI; selective subscriptions |
| Validation | Zod | Schema validation for timeline data; catches agent errors early |
| Language | TypeScript | Types as agent documentation, fewer bugs |
| Build | Vite | No SSR needed, fastest HMR |
| Coordinates | 4 frames | interstellar/system/encounter/surface avoids float precision issues |
| Time model | Non-linear progress | Semantic compression for transit; chapter-based scrubbing |
| Camera | Pure function of progress | Scrub, reverse, seek all work without GSAP state conflicts |
| Stars | Baked InstancedMesh | Set matrices once, animate via shaders; no per-frame JS updates |

## Scene-State Matrix (7 scenes)

| Scene | Frame | Visible Bodies | Camera Mode | Scrub Behavior | Transition In |
|-------|-------|---------------|-------------|----------------|---------------|
| Earth Departure | system | Sun, Earth, ISS, ship | Pull-back orbit | Dense (many events) | -- (initial) |
| Interstellar Transit | interstellar | Star field, trajectory, ship | Follow ship along curve | Compressed (low progressWeight) | Fade from Earth |
| Tau Ceti Approach | system | Tau Ceti, planets, Adrian | Fly-in to orbit | Medium density | Fade from interstellar |
| Encounter with Rocky | encounter | Hail Mary, Target A, tunnel | Orbit around ships | Dense (daily events) | Fade from system |
| Adrian Sampling | encounter | Adrian atmosphere, sampling chain | Follow chain descent | Dense (research events) | Fade from encounter |
| Rescue Search | interstellar | Star field, radar sweep, Target A | Wide search pan | Medium | Fade from encounter |
| 40 Eridani Settlement | system | Triple star, Eridian b, dome | Orbit to surface | Sparse (16-year summary) | Fade from interstellar |

## Agent Development Guidelines

- **Schema first**: always validate timeline.json changes against Zod schema
- **Pure functions**: timeline engine and camera interpolation are pure; test with unit tests
- **One responsibility per module**: clear interfaces; no line limit dogma
- **Data vs code**: scene content goes in JSON, rendering logic in components
- **Leva for tuning**: every visual parameter gets a debug control during development
- **No per-frame JS matrix updates for static geometry**: bake once, animate in shaders
