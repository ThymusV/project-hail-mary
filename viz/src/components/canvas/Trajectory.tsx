/**
 * Trajectory -- animated multi-segment flight-path through interstellar space.
 *
 * Four segments, each with its own color and TubeGeometry:
 *   1. Sol -> Tau Ceti (blue)
 *   2. Tau Ceti -> partial return (cyan)
 *   3. Turnaround -> rescue Rocky (red)
 *   4. Reunion -> 40 Eridani (gold)
 *
 * Each segment draws on independently as storyProgress advances.
 * Glowing spheres mark the separation (~0.65) and reunion (~0.75) points.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTimelineStore } from '@/stores/useTimelineStore';
import {
  getSegmentCurves,
  getSegmentAtProgress,
  TRAJECTORY_SEGMENTS,
} from '@/utils/sharedCurve';

// ── Constants ───────────────────────────────────────────────────────────

const CURVE_SEGMENTS = 256;
const TUBE_RADIUS = 0.06;
const TUBE_RADIAL_SEGMENTS = 6;

/** Glow pass: larger radius, lower opacity for soft bloom effect. */
const GLOW_RADIUS_MULTIPLIER = 2.5;
const GLOW_OPACITY = 0.18;

/** Progress ranges where each segment draws (start, end). */
const SEGMENT_PROGRESS_RANGES: [number, number][] = [
  [0.0, 0.35],   // Outbound
  [0.35, 0.65],  // Partial return
  [0.65, 0.75],  // Rescue turnaround
  [0.75, 1.0],   // To 40 Eridani
];

/** Positions for story-point markers. */
const SEPARATION_POINT = new THREE.Vector3(8.0, 1.5, 0.5);
const REUNION_POINT = new THREE.Vector3(9.5, 0.8, 0.3);

// ── Shader ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aCurveT;

  varying float vCurveT;

  void main() {
    vCurveT = aCurveT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uDrawProgress;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uGlowPass;

  varying float vCurveT;

  void main() {
    // Discard un-drawn portion
    if (vCurveT > uDrawProgress) discard;

    // Leading-edge glow: bright near the draw front
    float distToFront = uDrawProgress - vCurveT;
    float edgeGlow = exp(-distToFront * 25.0);

    // Gentle pulse on the drawn portion
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0 - vCurveT * 20.0);

    // Brightness: drawn trail is softer, edge is bright
    float brightness = mix(0.4 * pulse, 2.5, edgeGlow);

    // Fade in from start
    float fadeIn = smoothstep(0.0, 0.02, vCurveT);

    // Glow pass: softer, lower alpha for bloom halo
    float alpha = (0.6 + edgeGlow * 0.4) * fadeIn;
    if (uGlowPass > 0.5) {
      brightness *= 0.4;
      alpha *= ${GLOW_OPACITY.toFixed(2)};
    }

    gl_FragColor = vec4(uColor * brightness * fadeIn, alpha);
  }
`;

// ── Per-segment tube ────────────────────────────────────────────────────

interface SegmentTubeData {
  geometry: THREE.TubeGeometry;
  material: THREE.ShaderMaterial;
  glowGeometry: THREE.TubeGeometry;
  glowMaterial: THREE.ShaderMaterial;
  color: THREE.Color;
}

/**
 * Stamp the aCurveT attribute onto an existing TubeGeometry so the
 * draw-on shader knows where each vertex sits along the curve.
 */
function stampCurveT(
  tubeGeo: THREE.TubeGeometry,
  curve: THREE.CatmullRomCurve3,
): void {
  const posAttr = tubeGeo.getAttribute('position');
  const count = posAttr.count;
  const curveTs = new Float32Array(count);
  const tempVec = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    tempVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    let bestT = 0;
    let bestDist = Infinity;
    for (let s = 0; s <= 200; s++) {
      const t = s / 200;
      const pt = curve.getPointAt(t);
      const d = tempVec.distanceToSquared(pt);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
      }
    }
    curveTs[i] = bestT;
  }

  tubeGeo.setAttribute('aCurveT', new THREE.BufferAttribute(curveTs, 1));
}

function buildSegmentTube(
  curve: THREE.CatmullRomCurve3,
  colorHex: string,
): SegmentTubeData {
  // ── Core tube ──────────────────────────────────────────────────────
  const tubeGeo = new THREE.TubeGeometry(
    curve,
    CURVE_SEGMENTS,
    TUBE_RADIUS,
    TUBE_RADIAL_SEGMENTS,
    false,
  );
  stampCurveT(tubeGeo, curve);

  const color = new THREE.Color(colorHex);
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uDrawProgress: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: color },
      uGlowPass: { value: 0.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // ── Glow tube (larger radius, marked as glow pass) ────────────────
  const glowGeo = new THREE.TubeGeometry(
    curve,
    CURVE_SEGMENTS,
    TUBE_RADIUS * GLOW_RADIUS_MULTIPLIER,
    TUBE_RADIAL_SEGMENTS,
    false,
  );
  stampCurveT(glowGeo, curve);

  const glowMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uDrawProgress: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: color },
      uGlowPass: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  return { geometry: tubeGeo, material: mat, glowGeometry: glowGeo, glowMaterial: glowMat, color };
}

// ── Component ───────────────────────────────────────────────────────────

export function Trajectory() {
  const materialRefs = useRef<THREE.ShaderMaterial[]>([]);
  const glowMaterialRefs = useRef<THREE.ShaderMaterial[]>([]);
  const separationRef = useRef<THREE.Mesh>(null!);
  const reunionRef = useRef<THREE.Mesh>(null!);

  const tubes = useMemo(() => {
    const curves = getSegmentCurves();
    return curves.map((curve, i) =>
      buildSegmentTube(curve, TRAJECTORY_SEGMENTS[i].color),
    );
  }, []);

  // Store material refs for useFrame access
  const setMaterialRef = (index: number) => (el: THREE.ShaderMaterial | null) => {
    if (el) materialRefs.current[index] = el;
  };
  const setGlowMaterialRef = (index: number) => (el: THREE.ShaderMaterial | null) => {
    if (el) glowMaterialRefs.current[index] = el;
  };

  useFrame(({ clock }) => {
    const progress = useTimelineStore.getState().storyProgress;
    const time = clock.elapsedTime;

    // Update each segment's draw progress (core + glow)
    for (let i = 0; i < tubes.length; i++) {
      const [rangeStart, rangeEnd] = SEGMENT_PROGRESS_RANGES[i];
      const rangeSpan = rangeEnd - rangeStart;

      // Map global progress to this segment's local draw progress (0-1)
      let localDraw = 0;
      if (progress >= rangeEnd) {
        localDraw = 1;
      } else if (progress > rangeStart) {
        localDraw = (progress - rangeStart) / rangeSpan;
      }

      const mat = materialRefs.current[i];
      if (mat) {
        mat.uniforms.uDrawProgress.value = localDraw;
        mat.uniforms.uTime.value = time;
      }

      const glowMat = glowMaterialRefs.current[i];
      if (glowMat) {
        glowMat.uniforms.uDrawProgress.value = localDraw;
        glowMat.uniforms.uTime.value = time;
      }
    }

    // Separation marker: visible when progress passes ~0.65
    if (separationRef.current) {
      const sepAlpha = THREE.MathUtils.smoothstep(progress, 0.62, 0.67);
      separationRef.current.visible = sepAlpha > 0.01;
      const sepMat = separationRef.current.material as THREE.MeshStandardMaterial;
      sepMat.opacity = sepAlpha;
      // Subtle breathing
      const sepScale = 0.12 + 0.02 * Math.sin(time * 3);
      separationRef.current.scale.setScalar(sepScale);
    }

    // Reunion marker: visible when progress passes ~0.75
    if (reunionRef.current) {
      const renAlpha = THREE.MathUtils.smoothstep(progress, 0.72, 0.77);
      reunionRef.current.visible = renAlpha > 0.01;
      const renMat = reunionRef.current.material as THREE.MeshStandardMaterial;
      renMat.opacity = renAlpha;
      const renScale = 0.14 + 0.02 * Math.sin(time * 3 + 1);
      reunionRef.current.scale.setScalar(renScale);
    }
  });

  return (
    <group>
      {/* Segment tubes — core pass */}
      {tubes.map((tube, i) => (
        <mesh key={`core-${i}`} geometry={tube.geometry} frustumCulled={false}>
          <primitive
            object={tube.material}
            ref={setMaterialRef(i)}
            attach="material"
          />
        </mesh>
      ))}

      {/* Segment tubes — glow pass (larger radius, lower opacity) */}
      {tubes.map((tube, i) => (
        <mesh key={`glow-${i}`} geometry={tube.glowGeometry} frustumCulled={false}>
          <primitive
            object={tube.glowMaterial}
            ref={setGlowMaterialRef(i)}
            attach="material"
          />
        </mesh>
      ))}

      {/* Separation point marker (where Grace separates from Rocky) */}
      <mesh
        ref={separationRef}
        position={SEPARATION_POINT}
        visible={false}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#44ddff"
          emissive="#44ddff"
          emissiveIntensity={3}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Reunion point marker (where Grace rescues Rocky) */}
      <mesh
        ref={reunionRef}
        position={REUNION_POINT}
        visible={false}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#ff6644"
          emissive="#ff6644"
          emissiveIntensity={3}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
