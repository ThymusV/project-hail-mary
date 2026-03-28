/**
 * StarField — 8 000 instanced star particles rendered as Points.
 *
 * Geometry and color buffers are baked ONCE in a useEffect.
 * Twinkle animation runs entirely in the vertex/fragment shaders.
 * Three named stars (Sol, Tau Ceti, 40 Eridani) are rendered
 * separately as labeled spheres.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { temperatureToColor } from '@/utils/colors';

// ── Constants ───────────────────────────────────────────────────────────

const STAR_COUNT = 8_000;
const SPHERE_RADIUS = 200;

// Temperature range for random stars (Kelvin)
const TEMP_MIN = 2_800;
const TEMP_MAX = 35_000;

// ── Shader source ───────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute vec3 aColor;

  uniform float uTime;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    // Twinkle: combine two sine waves at different frequencies
    float twinkle = 0.7
      + 0.2 * sin(uTime * 0.8 + aPhase * 6.2831)
      + 0.1 * sin(uTime * 1.7 + aPhase * 3.1416);
    vAlpha = twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Size attenuation — larger when closer
    float dist = -mvPosition.z;
    gl_PointSize = aSize * (300.0 / max(dist, 1.0));
    // Clamp so very distant stars are still visible
    gl_PointSize = max(gl_PointSize, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Soft circular point with glow falloff
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);

    // Core: hard circle
    float core = 1.0 - smoothstep(0.0, 0.4, r);
    // Glow: soft halo
    float glow = exp(-r * 2.5) * 0.6;

    float brightness = core + glow;

    if (brightness < 0.01) discard;

    gl_FragColor = vec4(vColor * brightness, brightness * vAlpha);
  }
`;

// ── Helpers ─────────────────────────────────────────────────────────────

function hexToVec3(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// ── Pre-computed star data (module-level, runs once at import time) ──────

/**
 * Simple seeded PRNG (mulberry32) for deterministic star placement.
 * Using a seeded generator instead of Math.random keeps the render pure.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

interface StarBuffers {
  positions: Float32Array;
  colors: Float32Array;
  phases: Float32Array;
  sizes: Float32Array;
}

function generateStarBuffers(): StarBuffers {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const phases = new Float32Array(STAR_COUNT);
  const sizes = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    // Position — rejection sampling in sphere with seeded RNG
    let x: number, y: number, z: number;
    do {
      x = (rng() - 0.5) * 2;
      y = (rng() - 0.5) * 2;
      z = (rng() - 0.5) * 2;
    } while (x * x + y * y + z * z > 1);
    positions[i * 3] = x * SPHERE_RADIUS;
    positions[i * 3 + 1] = y * SPHERE_RADIUS;
    positions[i * 3 + 2] = z * SPHERE_RADIUS;

    // Color from random temperature
    const temp = TEMP_MIN + rng() * (TEMP_MAX - TEMP_MIN);
    const [r, g, b] = hexToVec3(temperatureToColor(temp));
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    // Random twinkle phase (0-1)
    phases[i] = rng();

    // Random size with a few brighter stars
    const roll = rng();
    if (roll > 0.995) {
      sizes[i] = 3.0 + rng() * 2.0;
    } else if (roll > 0.97) {
      sizes[i] = 1.5 + rng() * 1.5;
    } else {
      sizes[i] = 0.4 + rng() * 1.1;
    }
  }

  return { positions, colors, phases, sizes };
}

/** Pre-computed at module load — no Math.random during React render. */
const STAR_BUFFERS = generateStarBuffers();

// ── Component ───────────────────────────────────────────────────────────

export function StarField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  // Build Three.js objects from pre-computed buffers (pure, deterministic)
  const { geometry, material } = useMemo(() => {
    const { positions, colors, phases, sizes } = STAR_BUFFERS;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  // Update time uniform each frame
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <points geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
}
