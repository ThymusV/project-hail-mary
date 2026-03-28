# 3D Space-Time Visualization: Design Reference Document

## Project Context

Interactive 3D browser visualization for *Project Hail Mary* -- depicting a protagonist's
journey from Earth to Tau Ceti (~12 light-years). Requires a timeline scrubber,
smooth camera transitions, text overlays, spacecraft trajectory, star fields, and
planetary scenes.

---

## Part 1: Reference Projects (Ranked by Relevance)

### Tier 1 -- Directly Applicable

#### 1. Google "100,000 Stars" Chrome Experiment
- **URL:** https://stars.chromeexperiments.com/
- **Case study:** https://web.dev/case-studies/100000stars
- **What it is:** Interactive 3D visualization of the stellar neighborhood showing 100,000+ real stars with accurate positions. Zoom from the Sun outward through nearby stars to a galaxy-wide view.
- **Why it is great:**
  - Seamless multi-scale zoom (Sun -> nearby stars -> galaxy) -- exactly the scale transition needed for Earth-to-Tau-Ceti
  - Beautiful bloom/glow post-processing on stars
  - CSS3D text labels that face the camera and scale appropriately
  - Guided "tour" mode that narrates a journey through the stars with smooth camera paths
  - Uses real ESA/NASA positional data
- **What to borrow:**
  - Multi-scale LOD (level-of-detail) rendering strategy
  - The "tour" interaction model: auto-play with manual override
  - CSS3D for text overlays composited on top of WebGL canvas
  - Star glow shader technique (additive blending + point sprites)
- **Tech stack:** Three.js, CSS3D, Web Audio API, custom shaders

---

#### 2. NASA "Eyes on the Solar System"
- **URL:** https://eyes.nasa.gov/apps/solar-system/
- **What it is:** NASA/JPL's official browser-based 3D solar system explorer. Follow 150+ real missions, view accurate spacecraft trajectories, scrub through time.
- **Why it is great:**
  - Production-grade time scrubber that controls the entire 3D scene
  - Spacecraft trajectory lines rendered as 3D curves through space
  - Smooth camera transitions when selecting different bodies or missions
  - Timeline-driven: every object's position is a function of the selected date
  - Handles massive scale differences (planet surfaces to heliocentric view)
- **What to borrow:**
  - Time scrubber UI pattern: slider + play/pause + speed controls
  - The concept of "time as the master state" driving all 3D positions
  - Trajectory rendering as colored 3D spline curves
  - Camera transition system: smooth interpolation between viewpoints
  - Information panels that appear contextually alongside 3D objects
- **Tech stack:** WebGL (custom engine), SPICE ephemeris data

---

#### 3. Spacekit.js
- **URL:** https://typpo.github.io/spacekit/
- **GitHub:** https://github.com/typpo/spacekit
- **What it is:** Open-source JavaScript library specifically for 3D space visualizations. Supports Earth/Moon, solar system, and beyond-solar-system scales.
- **Why it is great:**
  - Purpose-built for exactly this domain (space visualization in the browser)
  - KeplerParticles class for rendering thousands of orbiting objects efficiently via GPU textures
  - Built-in support for skyboxes, realistic star backgrounds, and sphere objects (planets)
  - Clean API: Simulation > Camera > Objects hierarchy
  - Already handles the hard math (Keplerian orbital mechanics)
- **What to borrow:**
  - Potentially use as a foundation or study its architecture
  - Skybox vs. procedural star rendering approach
  - Object abstraction: RotatingObject, SphereObject, ShapeObject
  - Camera management patterns for space scenes
- **Tech stack:** Three.js (built on top), ES modules, npm package

---

#### 4. Codrops: Camera Fly-Through on Scroll (Theatre.js + R3F)
- **URL:** https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/
- **GitHub:** https://github.com/AndrewPrifer/CodropsCameraFlyThroughTutorial
- **What it is:** Tutorial demonstrating scroll-driven camera fly-through of a 3D scene using Theatre.js as the animation timeline and React Three Fiber for rendering.
- **Why it is great:**
  - Directly demonstrates the core interaction model: scroll/scrub = camera movement through 3D space
  - Theatre.js provides a visual editor for keyframing camera positions (huge time saver)
  - Clean separation of animation data (exportable JSON) from rendering code
  - Achievable in ~50 lines of code for the core mechanism
- **What to borrow:**
  - Theatre.js as the animation timeline engine (visual keyframe editor)
  - Scroll-position-to-animation-progress mapping pattern
  - Camera path as a spline with keyframed lookAt targets
  - Export animation state as JSON for production deployment
- **Tech stack:** React Three Fiber, Theatre.js, Drei, Vite

---

### Tier 2 -- Strong Technique References

#### 5. Gaia 3D Star Map (Charlie Hoey)
- **URL:** https://charliehoey.com/threejs-demos/gaia_dr1.html
- **What it is:** WebGL/WebVR visualization of ~2 million stars from ESA's Gaia DR1 catalog, positioned in accurate 3D space.
- **Why it is great:**
  - Renders 2M points performantly using BufferGeometry + point sprites
  - Real stellar positions -- you can see the actual 3D structure of the nearby galaxy
  - Drag-to-orbit, scroll-to-zoom -- clean, intuitive controls
  - Demonstrates that real star data can be rendered beautifully in-browser
- **What to borrow:**
  - BufferGeometry particle technique for rendering large star fields
  - Real Gaia catalog data for accurate star positions near Earth/Tau Ceti
  - Point sprite sizing based on stellar magnitude (brighter = larger)
  - The visual feel of being "inside" a star field
- **Tech stack:** Three.js, WebVR, Gaia DR1 data

---

#### 6. jsOrrery -- Solar System Simulator
- **URL:** https://mgvez.github.io/jsorrery/
- **GitHub:** https://github.com/mgvez/jsorrery
- **What it is:** WebGL solar system simulator with accurate orbital mechanics. Simulates gravity, supports multiple scenario configurations.
- **Why it is great:**
  - Configurable scenarios via a config object (useful pattern for multiple story events)
  - Accurate orbital paths rendered as trails
  - Time controls: play, pause, speed up, reverse
  - Clean architecture separating physics from rendering
- **What to borrow:**
  - Scenario/configuration pattern for defining different "scenes"
  - Time control UI: speed multiplier, play/pause, direction
  - Orbit trail rendering technique
  - Separation of simulation state from visual representation
- **Tech stack:** Three.js, Webpack, JPL ephemeris data

---

#### 7. Codrops: Cinematic 3D Scroll Experiences with GSAP
- **URL:** https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/
- **What it is:** Tutorial on building scroll-driven 3D cinematics using GSAP ScrollTrigger + ScrollSmoother with Three.js.
- **Why it is great:**
  - "Cinematic" is the right word -- the tutorial focuses on making scroll feel like directing a film
  - ScrollSmoother provides buttery-smooth scroll interpolation
  - CustomEase for non-linear camera movements (ease-in for approach, ease-out for arrival)
  - scrub: true binds animation progress directly to scroll position
  - Renders only when scroll position changes (performance optimization)
- **What to borrow:**
  - GSAP ScrollTrigger for binding 3D state to scroll/timeline position
  - ScrollSmoother for dampened, smooth scrubbing
  - CustomEase curves for cinematic camera movements
  - onUpdate callback pattern: only re-render when animation state changes
  - Pinning sections while 3D transitions play out
- **Tech stack:** Three.js, GSAP (ScrollTrigger, ScrollSmoother, CustomEase)

---

#### 8. Three.js Particle Galaxy Tutorials
- **URL (Codrops):** https://tympanus.net/codrops/2022/06/21/creating-a-particles-galaxy-with-three-js/
- **URL (Three.js Journey):** https://threejs-journey.com/lessons/animated-galaxy
- **URL (WebGPU version):** https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders
- **What it is:** Multiple tutorials covering particle-based galaxy/star-field rendering, from basic to 1M+ particles at 60fps using compute shaders.
- **Why it is great:**
  - Shows how to render stunning star fields with minimal geometry
  - Vertex shader animation: stars rotate at different speeds by distance from center
  - Custom fragment shaders for star appearance (soft glow, color variation by temperature)
  - The WebGPU compute shader version achieves 1M+ particles at 60fps
- **What to borrow:**
  - Vertex shader technique for animating star positions on GPU
  - Color palette: map star temperature to color (blue-white-yellow-orange-red)
  - Additive blending for natural-looking star luminosity
  - dat.gui / leva for development-time parameter tuning
  - Size attenuation for depth perception
- **Tech stack:** Three.js, GLSL shaders, (optionally WebGPU TSL)

---

#### 9. Three.js Unreal Bloom Post-Processing
- **URL (Official example):** https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html
- **URL (Selective bloom):** https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing/
- **What it is:** Three.js built-in post-processing pass that creates cinematic glow/bloom around bright objects -- essential for making stars and engines look luminous.
- **Why it is great:**
  - Makes stars, spacecraft engines, and energy effects look physically plausible
  - Selective bloom: only glow specific objects (stars glow, UI does not)
  - Configurable strength, radius, and threshold parameters
  - Composable with other post-processing passes (tone mapping, vignette)
- **What to borrow:**
  - UnrealBloomPass for star glow and engine thrust effects
  - Selective bloom technique using render layers
  - EffectComposer pipeline pattern for chaining visual effects
  - Performance tuning: bloom resolution can be lower than main render
- **Tech stack:** Three.js EffectComposer, custom ShaderPass

---

#### 10. "The Martian" Solar System Simulation
- **URL:** https://medium.com/@pint_drinker/physics-from-the-martian-simulating-the-solar-system-with-three-js-af605d7f7b69
- **What it is:** A Three.js simulation of the solar system built specifically to model the spacecraft trajectory from the sci-fi novel/film *The Martian*, including controllable spacecraft with keyboard-driven burns.
- **Why it is great:**
  - Directly analogous to our use case: a sci-fi novel's space journey visualized in 3D
  - Demonstrates spacecraft trajectory as a function of physics + planned burns
  - Keyboard-controllable spacecraft with delta-v budget
  - Shows how to tell a story through an interactive orbital mechanics simulation
- **What to borrow:**
  - Spacecraft trajectory computation and rendering approach
  - The concept of "mission events" mapped to simulation time
  - Visual language for showing planned vs actual trajectory
  - Approach to making orbital mechanics visually comprehensible
- **Tech stack:** Three.js, custom physics engine

---

### Tier 3 -- Supporting References

#### 11. Star Atlas (Three.js Night Sky)
- **URL:** https://discourse.threejs.org/t/star-atlas-an-interactive-map-of-the-night-sky/6404
- **Relevance:** PWA-ready star map with 60,000+ stars; demonstrates accelerometer-based interaction and offline capability.
- **Borrow:** PWA patterns, device orientation controls for mobile, magnitude-based star rendering.

#### 12. React Three Fiber Examples Gallery
- **URL:** https://r3f.docs.pmnd.rs/getting-started/examples
- **Relevance:** Curated collection of R3F examples demonstrating particles, shaders, post-processing, camera controls, and performance patterns.
- **Borrow:** Component architecture patterns, Drei helper usage, Zustand for state management.

#### 13. Maxime Heckel: Particles with R3F and Shaders
- **URL:** https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/
- **Relevance:** Deep technical tutorial on custom particle systems in R3F with GLSL shaders.
- **Borrow:** Frame Buffer Object (FBO) technique for GPU-driven particle simulation, shader patterns.

#### 14. Lusion Studio
- **URL:** https://lusion.co/
- **Relevance:** Award-winning (Awwwards SOTM) Three.js studio. Their portfolio demonstrates best-in-class WebGL interaction design, transitions, and performance.
- **Borrow:** Interaction design patterns, transition quality benchmarks, visual polish standards.

---

## Part 2: Visual Style Recommendations

### Color Palette
- **Deep space background:** Near-black with subtle blue-violet tint (#0a0a1a to #050510)
- **Stars:** Temperature-mapped colors (O/B-type: #aaccff blue-white, G-type/Sun: #fff4e0 warm white, K/M-type: #ffcc88 orange-red)
- **Spacecraft trajectory:** Bright accent line -- electric blue (#4488ff) or warm gold (#ffaa33) against dark space
- **UI elements:** Semi-transparent dark panels with light text, subtle borders (#ffffff15 backgrounds)
- **Planet atmospheres:** Subtle rim lighting / fresnel glow

### Rendering Approach
- **Stars:** Point sprites with BufferGeometry (10,000-100,000 stars). Size = f(magnitude), color = f(temperature). Additive blending.
- **Key stars (Sun, Tau Ceti):** Sphere geometry + custom glow shader + UnrealBloomPass
- **Planets:** SphereGeometry with PBR materials (texture maps for Earth, procedural for others)
- **Spacecraft:** Simple geometric model or loaded GLTF. Engine glow via emissive material + bloom.
- **Trajectory:** TubeGeometry or Line2 (fat lines) along a CatmullRomCurve3 path
- **Background:** Either a high-res star skybox (milky way panorama) or procedural star particles

### Post-Processing Pipeline
1. RenderPass (main scene)
2. UnrealBloomPass (selective -- stars and engines only)
3. Optional: FilmPass for subtle grain (cinematic feel)
4. Optional: VignetteShader for edge darkening

---

## Part 3: Interaction Model Recommendations

### Primary Interaction: Timeline Scrubber
The central UI element. All 3D state derives from the current "story time."

```
|<< [|>] >>|  [=====O========================] 2024 ---------- 2030
              Day 1: Launch        Day 847: Arrival at Tau Ceti
```

**Behavior:**
- Drag the scrubber handle to move through the story
- Play/pause button for auto-advancement
- Speed controls (1x, 10x, 100x, 1000x) for time compression
- Click on event markers to jump directly to key moments
- Keyboard: arrow keys for fine scrubbing, spacebar for play/pause

### Secondary Interaction: Camera Orbit
- When scrubber is stationary, user can orbit/zoom around the current scene
- OrbitControls (or CameraControls from Drei) with constrained zoom range
- Smooth camera reset when scrubber moves to next event

### Camera Transition System
Each story event defines:
1. Camera position (Vector3)
2. Camera lookAt target (Vector3)
3. Camera FOV (for dramatic zoom effects)
4. Transition duration and easing curve

When the timeline moves between events, the camera smoothly interpolates between these keyframes using:
- Position: CatmullRomCurve3 interpolation
- Rotation: Quaternion slerp
- FOV: linear interpolation
- Easing: GSAP CustomEase or Theatre.js curves

### Event-Driven Scene Changes
| Story Event | Camera Behavior | Scene Content |
|---|---|---|
| Launch from Earth | Pull back from surface to orbit | Earth, ISS, launch vehicle |
| Earth orbit departure | Slow zoom out, rotate to show trajectory | Earth shrinking, trajectory line extending |
| Interstellar transit | Wide field showing star field | Particle stars, trajectory line, distance counter |
| Tau Ceti approach | Slow zoom toward growing star | Tau Ceti growing brighter, planetary system appearing |
| Arrival / orbit | Cinematic fly-around | Planet surface, spacecraft in orbit |

---

## Part 4: Key UI Components Needed

### 1. Timeline Scrubber Bar
- Horizontal bar at bottom of screen
- Event markers (clickable dots/diamonds) at key story moments
- Current time display (mission day, Earth date, or both)
- Distance readout (AU or light-years from Earth)
- Play/pause, speed controls

### 2. Event Info Panel
- Slides in from side or fades in as overlay
- Event title, date, description text
- Semi-transparent dark background with blur backdrop
- Auto-hides after a few seconds or when user interacts with 3D scene

### 3. Scene Labels (CSS3D or HTML Overlay)
- Star names, planet names, distance annotations
- Scale with distance (fade out when too far/close)
- Always face camera (billboard behavior)
- Use CSS3D renderer composited on WebGL canvas (per 100,000 Stars approach)

### 4. Distance / Scale Indicator
- Current distance from Earth (updating in real-time as timeline moves)
- Light-year scale bar or grid
- Speed indicator (fraction of c)

### 5. Navigation Mini-Map (Optional)
- Small top-down 2D view showing Sun, trajectory, Tau Ceti
- Current position marker
- Click to jump to location on trajectory

### 6. Loading Screen
- Progressive loading with percentage
- Could show a star field building up as assets load

---

## Part 5: Recommended Tech Stack

### Core Rendering
| Option A (React ecosystem) | Option B (Vanilla Three.js) |
|---|---|
| React Three Fiber (@react-three/fiber) | Three.js directly |
| Drei (@react-three/drei) for helpers | Custom helper utilities |
| Zustand for state management | Custom event system |
| React for UI overlays | Vanilla HTML/CSS overlays |

**Recommendation: Option A** if you want component-based architecture, rich ecosystem, and faster iteration. Option B if you want maximum control and smaller bundle.

### Animation / Timeline
| Library | Role |
|---|---|
| **Theatre.js** | Visual keyframe editor for camera paths. Export to JSON. Best for authoring complex camera choreography. |
| **GSAP + ScrollTrigger** | Alternative to Theatre.js. Excellent for scroll-driven or scrubber-driven animation. More mature, larger community. |
| **@react-three/drei CameraControls** | Runtime camera orbit/zoom when user is exploring freely. |

**Recommendation:** GSAP for timeline/scrubber binding (more control, better docs). Theatre.js if you want a visual editor for camera paths during development.

### Post-Processing
- **Three.js EffectComposer** or **pmndrs/postprocessing** (R3F-compatible)
- UnrealBloomPass, FilmPass, ShaderPass

### Data
- Star positions: Gaia DR3 catalog (subset of nearby stars within ~50 ly)
- Planetary data: NASA/JPL ephemeris or simplified Keplerian elements
- Story events: JSON file with timestamps, descriptions, camera keyframes

---

## Part 6: Architecture Sketch

```
[Story Data JSON]
       |
       v
[Timeline Engine] ---> [Current Time State]
       |                       |
       v                       v
[GSAP/Theatre.js]      [3D Scene Manager]
       |                       |
       v                       v
[Camera Keyframes]     [Object Positions]
       |                       |
       v                       v
[Camera Controller]    [Three.js Scene]
       |                       |
       +-------+-------+-------+
               |
               v
       [EffectComposer]
               |
               v
       [WebGL Canvas]
               +
       [CSS3D / HTML Overlay]
               |
               v
       [Timeline UI Bar]
       [Event Info Panel]
       [Labels & Annotations]
```

**Core principle:** Time is the single source of truth. Every visual element --
camera position, object positions, label visibility, trajectory progress -- is a
pure function of the current story time. The timeline scrubber controls time;
everything else reacts.

---

## Part 7: Performance Considerations

1. **Star rendering:** Use InstancedBufferGeometry or Points (BufferGeometry) with custom shaders. Avoid individual mesh per star.
2. **LOD strategy:** Show fewer stars when zoomed into a planet; show full star field in transit view. Shader-based LOD via size attenuation.
3. **Render on demand:** Only call renderer.render() when animation is active or user is interacting. Use GSAP onUpdate or invalidateFrameloop in R3F.
4. **Texture budget:** Compress planet textures (basis/ktx2). Lazy-load textures for planets not yet visible.
5. **Bloom resolution:** Render bloom pass at half resolution for 4x performance gain with minimal quality loss.
6. **Mobile:** Reduce particle count, disable bloom or use simplified glow sprites, lower render resolution via renderer.setPixelRatio(1).

---

## Sources

- [100,000 Stars Chrome Experiment](https://stars.chromeexperiments.com/)
- [Making 100,000 Stars (Case Study)](https://web.dev/case-studies/100000stars)
- [NASA Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/)
- [Spacekit.js](https://typpo.github.io/spacekit/) | [GitHub](https://github.com/typpo/spacekit)
- [Camera Fly-Through with Theatre.js + R3F (Codrops)](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/)
- [Gaia 3D Star Map (Charlie Hoey)](https://charliehoey.com/threejs-demos/gaia_dr1.html)
- [jsOrrery Solar System Simulator](https://mgvez.github.io/jsorrery/) | [GitHub](https://github.com/mgvez/jsorrery)
- [Cinematic 3D Scroll Experiences with GSAP (Codrops)](https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/)
- [Creating a Particles Galaxy with Three.js (Codrops)](https://tympanus.net/codrops/2022/06/21/creating-a-particles-galaxy-with-three-js/)
- [Interactive Galaxy with WebGPU Compute Shaders](https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders)
- [Three.js Unreal Bloom Example](https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html)
- [Selective Bloom in Three.js](https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing/)
- [The Martian Solar System Simulation](https://medium.com/@pint_drinker/physics-from-the-martian-simulating-the-solar-system-with-three-js-af605d7f7b69)
- [React Three Fiber Examples](https://r3f.docs.pmnd.rs/getting-started/examples)
- [Drei Library](https://github.com/pmndrs/drei)
- [Particles with R3F and Shaders (Maxime Heckel)](https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/)
- [GSAP ScrollTrigger Docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [Theatre.js with R3F](https://www.theatrejs.com/docs/0.5/getting-started/with-react-three-fiber)
- [Lusion Studio](https://lusion.co/)
- [Star Atlas (Three.js Night Sky)](https://discourse.threejs.org/t/star-atlas-an-interactive-map-of-the-night-sky/6404)
- [NASA Trajectory Browser](https://trajbrowser.arc.nasa.gov/index.php)
- [Gaia Sky](https://gaiasky.space/)
- [Globe.GL](https://globe.gl/)
- [Scroll-Driven Presentation in Three.js with GSAP](https://medium.com/@pablobandinopla/scroll-driven-presentation-in-threejs-with-gsap-a2be523e430a)
- [Space Travel WebGL Experience](https://github.com/frequin/space-travel)
