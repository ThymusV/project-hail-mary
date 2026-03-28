/**
 * Trajectory — animated flight-path curve through interstellar space.
 *
 * CatmullRom spline: Sol [0,0,0] -> Tau Ceti [11.9,0,0] -> 40 Eridani [-8,12,3]
 * The line "draws" as timeline progresses, with a glowing leading edge.
 * Uses custom shader for the animated dash / draw effect.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTimelineStore } from '@/stores/useTimelineStore';

// ── Constants ───────────────────────────────────────────────────────────

/** Key waypoints in interstellar frame (light-years). */
const WAYPOINTS = [
  new THREE.Vector3(0, 0, 0),       // Sol
  new THREE.Vector3(5.0, 0.8, 0.3), // mid-transit control
  new THREE.Vector3(11.9, 0, 0),    // Tau Ceti
  new THREE.Vector3(4.0, 8.0, 1.5), // return arc control
  new THREE.Vector3(-8, 12, 3),     // 40 Eridani
];

const CURVE_SEGMENTS = 512;
const TUBE_RADIUS = 0.04;
const TUBE_RADIAL_SEGMENTS = 6;

// ── Shader ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aCurveT;
  uniform float uDrawProgress;

  varying float vCurveT;
  varying float vDraw;

  void main() {
    vCurveT = aCurveT;

    // How far along the drawn portion this vertex is
    vDraw = uDrawProgress;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uDrawProgress;
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uAccentColor;

  varying float vCurveT;
  varying float vDraw;

  void main() {
    // Discard un-drawn portion
    if (vCurveT > uDrawProgress) discard;

    // Leading-edge glow: bright near the draw front
    float distToFront = uDrawProgress - vCurveT;
    float edgeGlow = exp(-distToFront * 25.0);

    // Gentle pulse on the drawn portion
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0 - vCurveT * 20.0);

    // Base color with warm accent blend near leading edge
    vec3 color = mix(uColor, uAccentColor, edgeGlow * 0.6);

    // Brightness: drawn trail is softer, edge is bright
    float brightness = mix(0.4 * pulse, 2.5, edgeGlow);

    // Fade in from start
    float fadeIn = smoothstep(0.0, 0.02, vCurveT);

    gl_FragColor = vec4(color * brightness * fadeIn, (0.6 + edgeGlow * 0.4) * fadeIn);
  }
`;

// ── Component ───────────────────────────────────────────────────────────

export function Trajectory() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { geometry, material, curve } = useMemo(() => {
    // Build spline
    const spline = new THREE.CatmullRomCurve3(WAYPOINTS, false, 'centripetal', 0.5);

    // Create tube geometry
    const tubeGeo = new THREE.TubeGeometry(
      spline,
      CURVE_SEGMENTS,
      TUBE_RADIUS,
      TUBE_RADIAL_SEGMENTS,
      false,
    );

    // Compute per-vertex curve parameter (0-1) for draw effect
    const posAttr = tubeGeo.getAttribute('position');
    const count = posAttr.count;
    const curveTs = new Float32Array(count);

    // For each vertex, find the nearest point on the curve
    const tempVec = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      tempVec.set(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i),
      );
      // Sample curve to find closest t
      let bestT = 0;
      let bestDist = Infinity;
      for (let s = 0; s <= 200; s++) {
        const t = s / 200;
        const pt = spline.getPointAt(t);
        const d = tempVec.distanceToSquared(pt);
        if (d < bestDist) {
          bestDist = d;
          bestT = t;
        }
      }
      curveTs[i] = bestT;
    }

    tubeGeo.setAttribute('aCurveT', new THREE.BufferAttribute(curveTs, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uDrawProgress: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#4488ff') },
        uAccentColor: { value: new THREE.Color('#88aaff') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    return { geometry: tubeGeo, material: mat, curve: spline };
  }, []);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const progress = useTimelineStore.getState().storyProgress;
    materialRef.current.uniforms.uDrawProgress.value = progress;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  // Export curve for other components
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

// ── Shared curve for Spacecraft positioning ─────────────────────────────

/** Singleton spline for use by Spacecraft component. */
let _sharedCurve: THREE.CatmullRomCurve3 | null = null;

export function getSharedCurve(): THREE.CatmullRomCurve3 {
  if (!_sharedCurve) {
    _sharedCurve = new THREE.CatmullRomCurve3(WAYPOINTS, false, 'centripetal', 0.5);
  }
  return _sharedCurve;
}
