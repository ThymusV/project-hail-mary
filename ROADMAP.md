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

### M0.2 - Codex Review & Plan Finalization
- [ ] Codex review round 1: validate architecture and data model
- [ ] Codex review round 2: address feedback, refine plan
- [ ] User confirmation of final plan

---

## Phase 1: Scaffold & Static Scene
**Goal: A working 3D scene with stars, trajectory line, and basic camera**

### M1.1 - Project Bootstrap
- Vite + React 19 + TypeScript project setup
- Install all dependencies (R3F, Drei, GSAP, Zustand, postprocessing)
- Configure Vite, TypeScript, ESLint
- Basic `<Canvas>` rendering with black background

### M1.2 - Star Field
- 10,000 instanced stars with random positions in a sphere
- Star color mapped to temperature (blue-white-yellow-orange-red)
- Size attenuation for depth perception
- Key stars (Sol, Tau Ceti, 40 Eridani) rendered as larger, labeled objects

### M1.3 - Trajectory Curve
- CatmullRomCurve3 from Sol → Tau Ceti → 40 Eridani
- TubeGeometry or Line2 with glow material
- Spacecraft marker (simple geometry) positioned on curve

### M1.4 - Bloom Post-Processing
- EffectComposer with selective Bloom
- Stars and trajectory glow, UI elements do not
- Leva controls for bloom tuning

---

## Phase 2: Timeline Engine & Camera System
**Goal: Scrub through time and the camera follows**

### M2.1 - Timeline Data
- Convert 85 events to `timeline.json` with normalized time, positions, camera waypoints
- TypeScript interfaces for TimelineEvent, CameraWaypoint
- Zustand store: currentTime, isPlaying, playbackSpeed

### M2.2 - Timeline UI
- Horizontal scrub bar at bottom of screen
- Event markers (clickable dots) on the bar
- Play/pause, speed controls (1x/10x/100x)
- Current event label display
- Keyboard controls: arrows for scrub, spacebar for play/pause

### M2.3 - Camera Rig
- GSAP-driven camera transitions between event waypoints
- Smooth position interpolation (CatmullRomCurve3)
- Quaternion slerp for rotation
- FOV animation for dramatic zoom
- OrbitControls when timeline is paused

### M2.4 - Spacecraft Animation
- Ship position = f(currentTime) along trajectory curve
- Engine glow intensity based on acceleration phase
- Rotation to face direction of travel

---

## Phase 3: Scene Detail & Events
**Goal: Rich scenes at each waypoint with event context**

### M3.1 - Sol System Scene
- Earth with basic texture
- ISS marker at orbit altitude
- Launch trajectory from Earth surface to orbit
- Astrophage infection visualization (Petrova line)

### M3.2 - Interstellar Transit Scene
- Speed-of-light reference grid
- Distance counter (light-years from Earth)
- Time dilation indicator (ship time vs Earth time)
- Star field parallax during transit

### M3.3 - Tau Ceti System Scene
- Tau Ceti star with planetary system
- Adrian (planet) with atmosphere glow
- Rocky's ship (Target A) -- 139m triangular vessel
- Connection tunnel between ships
- Sampling chain descent to Adrian

### M3.4 - Return & Rescue Scene
- Beetle probes (John/Paul/George/Ringo) launch trajectories
- Search radar visualization (55-degree scan)
- Grace's turnaround trajectory
- Rescue approach to disabled Target A

### M3.5 - 40 Eridani Scene
- Triple star system (40 Eridani A/B/C)
- Eridian b planet (high gravity, ammonia atmosphere)
- Grace's habitat dome on surface

### M3.6 - Info Panel
- Slide-in panel with event title, date, description
- Chapter reference and character involvement
- Semi-transparent dark blur background
- Auto-hide after interaction

---

## Phase 4: Polish & Interaction
**Goal: Cinematic quality and smooth UX**

### M4.1 - Visual Polish
- Planet textures (PBR materials)
- Custom star glow shaders
- Particle effects (engine exhaust, Astrophage swarm)
- Vignette + film grain post-processing
- Loading screen with progressive star field

### M4.2 - Navigation
- Chapter quick-jump bar
- Mini-map (2D top-down view)
- Dual timeline toggle (narrative vs chronological)
- URL hash state for shareability

### M4.3 - Performance
- Render-on-demand (invalidateFrameloop)
- LOD for star field
- Lazy texture loading
- Mobile: reduced particles, DPR cap, simplified bloom
- Target: 60fps on mid-range hardware

### M4.4 - Responsive Design
- Mobile-friendly touch controls
- Responsive UI layout
- Reduced visual complexity on low-end devices

---

## Phase 5: Content & Extras (Stretch)
**Goal: Deep storytelling integration**

- Astrophage infection chain visualization (star-to-star propagation map)
- Taumoeba evolution timeline (breeding generations)
- Ship schematic overlay (using book's actual diagrams)
- Audio narration at key events
- Eridian language visualization (harmonic waveforms)
- Real Gaia DR3 star positions for nearby stars

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | R3F over raw Three.js | Declarative, agent-friendly, same performance |
| Animation | GSAP over Theatre.js | Better docs, timeline scrubbing, larger community |
| State | Zustand over Redux/Context | Minimal, pmndrs ecosystem, selective subscriptions |
| Language | TypeScript over JS | Types as agent documentation, fewer bugs |
| Build | Vite over Next.js | No SSR needed, fastest HMR |
| Stars | InstancedMesh over Points | Better bloom interaction, cleaner at close range |
| Scale | 1 unit = 0.1 ly | Keeps numbers manageable, 12 ly = 120 units |

## Context for Agents

- **All development by AI agents** -- files stay under 150 lines, clear interfaces, data-driven
- **timeline.json is the single source of truth** for all story content
- **Zustand stores bridge Canvas and UI** -- no prop drilling across the boundary
- **useFrame for per-frame work, React for structure** -- never trigger reconciliation from the render loop
- **Leva for runtime tuning** -- every visual parameter should have a debug control during development
