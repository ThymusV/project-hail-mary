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
- [x] Document UI component requirements

### Technical Research
- [x] Evaluate 3D frameworks (R3F vs Three.js vs Babylon.js)
- [x] Evaluate animation approaches (GSAP vs Theatre.js vs framer-motion)
- [x] Define project structure and architecture patterns
- [x] Specify dependency list with versions

### Planning
- [x] Write README.md
- [x] Write ROADMAP.md
- [x] Write TASK.md
- [~] Codex review round 1
- [ ] Codex review round 2
- [ ] User confirmation

---

## Phase 1: Scaffold & Static Scene

### M1.1 - Project Bootstrap
- [ ] `npm create vite@latest` with react-ts template
- [ ] Install core dependencies (three, R3F, drei, postprocessing, gsap, zustand)
- [ ] Install dev dependencies (leva, vitest, @types/three)
- [ ] Configure vite.config.ts (path aliases, chunk settings)
- [ ] Configure tsconfig.json (strict mode, path aliases)
- [ ] Create base App.tsx with `<Canvas>` + UI overlay structure
- [ ] Verify dev server starts and renders black canvas

### M1.2 - Star Field
- [ ] Create StarField.tsx with InstancedMesh (10K stars)
- [ ] Implement star color temperature mapping (utils/colors.ts)
- [ ] Add size attenuation based on distance
- [ ] Create key star objects (Sol, Tau Ceti, 40 Eridani) as labeled spheres
- [ ] Add Leva controls: star count, size range, color intensity

### M1.3 - Trajectory Curve
- [ ] Define waypoint positions in coordinates.ts (Sol=origin, TauCeti=120, Eridani40=offset)
- [ ] Create Trajectory.tsx with CatmullRomCurve3
- [ ] Render as TubeGeometry with emissive material (for bloom)
- [ ] Add Spacecraft.tsx: simple cone geometry on curve
- [ ] Add Leva controls: trajectory color, tube radius, segments

### M1.4 - Post-Processing
- [ ] Create Effects.tsx with EffectComposer
- [ ] Configure selective Bloom (luminanceThreshold=1, mipmapBlur)
- [ ] Add ToneMapping pass
- [ ] Verify stars and trajectory glow, UI remains sharp
- [ ] Add Leva controls: bloom intensity, threshold, radius

---

## Phase 2: Timeline Engine & Camera

### M2.1 - Timeline Data
- [ ] Design TimelineEvent TypeScript interface
- [ ] Design CameraWaypoint TypeScript interface
- [ ] Convert 85 events to timeline.json (id, time, missionDay, yearEarth, position, camera, description)
- [ ] Create useTimelineStore.ts (currentTime, isPlaying, playbackSpeed, seekToEvent)
- [ ] Create useCameraStore.ts (activeWaypoint, transitionState)
- [ ] Create useUIStore.ts (panelVisible, selectedEvent, helpVisible)

### M2.2 - Timeline UI
- [ ] Create TimelineSlider.tsx (horizontal bar, bottom of screen)
- [ ] Add event marker dots on slider (clickable)
- [ ] Add play/pause button, speed selector (1x/10x/100x)
- [ ] Add current event label and mission day display
- [ ] Add keyboard shortcuts (arrows, spacebar)
- [ ] Style with semi-transparent dark theme

### M2.3 - Camera Rig
- [ ] Create CameraRig.tsx (pure logic component)
- [ ] Implement GSAP-driven position transitions between waypoints
- [ ] Implement quaternion slerp for smooth rotation
- [ ] Add FOV animation for dramatic zoom effects
- [ ] Integrate OrbitControls for free exploration when paused
- [ ] Add easing curves for cinematic feel (power2.inOut)

### M2.4 - Spacecraft Animation
- [ ] Map currentTime → trajectory curve position
- [ ] Animate ship orientation (tangent to curve)
- [ ] Animate engine glow intensity (acceleration/deceleration phases)
- [ ] Add trail effect behind spacecraft

---

## Phase 3: Scene Detail

### M3.1 - Sol System
- [ ] Earth sphere with basic texture
- [ ] ISS marker in orbit
- [ ] Petrova line visualization (IR curve from Sun to Venus)
- [ ] Launch animation

### M3.2 - Transit Scene
- [ ] Distance counter HUD (light-years from Earth)
- [ ] Ship time vs Earth time display
- [ ] Star parallax during high-speed transit
- [ ] Speed-of-light reference grid/rings

### M3.3 - Tau Ceti System
- [ ] Tau Ceti star + planetary orbits
- [ ] Adrian planet with atmosphere
- [ ] Rocky's ship (Target A) model/geometry
- [ ] Connection tunnel between ships
- [ ] Sampling chain descent visualization

### M3.4 - Rescue Scene
- [ ] Beetle probe launch trajectories (4 probes)
- [ ] Search radar sweep visualization
- [ ] Grace's turnaround trajectory
- [ ] Approach to disabled Target A

### M3.5 - 40 Eridani Scene
- [ ] Triple star system
- [ ] Eridian b planet
- [ ] Habitat dome on surface

### M3.6 - Info Panel
- [ ] Create InfoPanel.tsx (slide-in from right)
- [ ] Display event title, date, description, chapter
- [ ] Semi-transparent blur background
- [ ] Auto-hide on timeline interaction

---

## Phase 4: Polish

### M4.1 - Visual
- [ ] Planet PBR textures
- [ ] Custom star glow shaders
- [ ] Engine exhaust particles
- [ ] Astrophage swarm particles
- [ ] Vignette + film grain
- [ ] Loading screen

### M4.2 - Navigation
- [ ] Chapter quick-jump bar (NavigationBar.tsx)
- [ ] 2D mini-map (top-down trajectory view)
- [ ] Dual timeline toggle (narrative vs chronological)
- [ ] URL hash state

### M4.3 - Performance
- [ ] Render-on-demand (frameloop="demand")
- [ ] Star field LOD
- [ ] Lazy texture loading
- [ ] Mobile DPR cap + reduced particles
- [ ] Performance profiling and optimization pass

---

## Backlog / Stretch

- [ ] Astrophage infection chain (star-to-star propagation map)
- [ ] Taumoeba evolution timeline
- [ ] Ship schematic overlay (book diagrams)
- [ ] Audio narration triggers
- [ ] Eridian harmonic language visualization
- [ ] Real Gaia DR3 star catalog integration
- [ ] i18n (Chinese + English)
