/**
 * Spacecraft — ship marker that follows the trajectory curve.
 *
 * Positioned on the CatmullRom spline based on storyProgress.
 * Oriented tangent to the curve (faces direction of travel).
 * Small emissive octahedron with engine trail particles.
 */

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { getSharedCurve } from '@/utils/sharedCurve';

// ── Constants ───────────────────────────────────────────────────────────

const SHIP_SCALE = 0.15;
const TRAIL_COUNT = 24;
const TRAIL_DECAY = 0.92;

// ── Trail particle vertex/fragment shaders ──────────────────────────────

const trailVertexShader = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;

  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / max(-mvPosition.z, 1.0));
    gl_PointSize = max(gl_PointSize, 0.5);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    float glow = exp(-r * 3.0);
    if (glow < 0.01) discard;

    vec3 color = mix(vec3(0.3, 0.6, 1.0), vec3(0.8, 0.9, 1.0), glow);
    gl_FragColor = vec4(color * glow * 2.0, glow * vAlpha);
  }
`;

// ── Component ───────────────────────────────────────────────────────────

export function Spacecraft() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const trailPointsRef = useRef<THREE.Points>(null!);

  // Trail buffers
  const trail = useMemo(() => {
    const positions = new Float32Array(TRAIL_COUNT * 3);
    const alphas = new Float32Array(TRAIL_COUNT);
    const sizes = new Float32Array(TRAIL_COUNT);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      alphas[i] = 0;
      sizes[i] = 0.8 * (1 - i / TRAIL_COUNT) + 0.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  // Scratch vectors
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _tangent = useMemo(() => new THREE.Vector3(), []);
  const _lookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const progress = useTimelineStore.getState().storyProgress;
    const curve = getSharedCurve();

    // Clamp to avoid edge issues
    const t = Math.max(0.001, Math.min(0.999, progress));

    // Get position and tangent on curve
    curve.getPointAt(t, _pos);
    curve.getTangentAt(t, _tangent);

    // Update ship position
    if (meshRef.current) {
      meshRef.current.position.copy(_pos);

      // Orient along tangent
      _lookAt.copy(_pos).add(_tangent);
      meshRef.current.lookAt(_lookAt);
    }

    // Update trail particles — shift positions back, add new head
    const posAttr = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = trail.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const alphaArr = alphaAttr.array as Float32Array;

    // Shift trail: move each particle one slot back
    for (let i = TRAIL_COUNT - 1; i > 0; i--) {
      posArr[i * 3] = posArr[(i - 1) * 3];
      posArr[i * 3 + 1] = posArr[(i - 1) * 3 + 1];
      posArr[i * 3 + 2] = posArr[(i - 1) * 3 + 2];
      alphaArr[i] = alphaArr[i - 1] * TRAIL_DECAY;
    }

    // Head of trail = ship position
    posArr[0] = _pos.x;
    posArr[1] = _pos.y;
    posArr[2] = _pos.z;
    alphaArr[0] = progress > 0.001 ? 1.0 : 0.0;

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Ship body */}
      <mesh ref={meshRef} scale={SHIP_SCALE}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#88bbff"
          emissive="#4488ff"
          emissiveIntensity={2.5}
          toneMapped={false}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Engine trail */}
      <points
        ref={trailPointsRef}
        geometry={trail.geometry}
        frustumCulled={false}
      >
        <primitive object={trail.material} attach="material" />
      </points>
    </group>
  );
}
