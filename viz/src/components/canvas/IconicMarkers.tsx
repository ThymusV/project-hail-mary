/**
 * IconicMarkers -- exaggerated markers visible at interstellar scale.
 *
 * - Earth: blue sphere with ring at Sol [0,0,0], labeled "地球/Earth"
 * - Target A (Rocky's ship): orange diamond that appears at ~0.35
 *   near Tau Ceti, moves along its own path, separates at ~0.65,
 *   goes dark at ~0.72, found again at ~0.75
 *
 * The Spacecraft component already handles the Hail Mary ship.
 */

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { useTimelineStore } from '@/stores/useTimelineStore';

// ── Earth marker ───────────────────────────────────────────────────────

const EARTH_POS: [number, number, number] = [0, 0, 0];
const EARTH_RADIUS = 0.25;

function EarthMarker() {
  return (
    <group position={EARTH_POS}>
      {/* Earth sphere */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 24, 24]} />
        <meshStandardMaterial
          color="#3366cc"
          emissive="#2244aa"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>

      {/* Orbital ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[EARTH_RADIUS + 0.12, EARTH_RADIUS + 0.18, 48]} />
        <meshBasicMaterial
          color="#6699ff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      <Billboard>
        <Text
          position={[0, EARTH_RADIUS + 0.5, 0]}
          fontSize={0.28}
          color="#88bbff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.015}
          outlineColor="#000000"
          font={undefined}
        >
          {'地球/Earth'}
          <meshBasicMaterial
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </Text>
      </Billboard>
    </group>
  );
}

// ── Target A marker (Rocky's ship) ─────────────────────────────────────

/** Waypoints for Target A's independent trajectory. */
const TARGET_A_PATH = [
  new THREE.Vector3(11.9, 0.3, -0.2),    // appears near Tau Ceti
  new THREE.Vector3(10.0, 0.5, 0.0),     // travels with Hail Mary
  new THREE.Vector3(8.0, 1.5, 0.5),      // separation point
  new THREE.Vector3(9.0, 1.0, 0.3),      // drifts after separation
  new THREE.Vector3(9.5, 0.8, 0.3),      // found / reunion
  new THREE.Vector3(4.0, 6.0, 1.5),      // toward 40 Eridani
  new THREE.Vector3(-8, 12, 3),           // 40 Eridani
];

function TargetAMarker() {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(TARGET_A_PATH, false, 'centripetal', 0.5),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current || !materialRef.current) return;

    const progress = useTimelineStore.getState().storyProgress;

    // Target A appears at ~0.35, moves along its path
    const APPEAR = 0.35;
    const VISIBLE_END = 1.0;

    if (progress < APPEAR || progress > VISIBLE_END) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Map progress (0.35-1.0) to path t (0-1)
    const pathT = Math.max(0, Math.min(1, (progress - APPEAR) / (VISIBLE_END - APPEAR)));
    const pos = curve.getPointAt(pathT);
    groupRef.current.position.copy(pos);

    // Goes dark between separation (~0.65) and reunion (~0.75)
    const isDark = progress >= 0.66 && progress <= 0.74;
    const targetEmissive = isDark ? 0.3 : 2.0;
    const targetOpacity = isDark ? 0.35 : 1.0;

    // Smooth transition
    materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      materialRef.current.emissiveIntensity,
      targetEmissive,
      0.08,
    );
    materialRef.current.opacity = THREE.MathUtils.lerp(
      materialRef.current.opacity,
      targetOpacity,
      0.08,
    );

    // Gentle spin
    groupRef.current.rotation.y = clock.elapsedTime * 0.8;
    groupRef.current.rotation.z = clock.elapsedTime * 0.3;

    // Pulse scale
    const scale = 0.22 + 0.03 * Math.sin(clock.elapsedTime * 2.5);
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Diamond / octahedron shape */}
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#ff8833"
          emissive="#ff6600"
          emissiveIntensity={2.0}
          toneMapped={false}
          transparent
          opacity={1}
          metalness={0.6}
          roughness={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      <Billboard>
        <Text
          position={[0, 5.5, 0]}
          fontSize={1.3}
          color="#ffaa44"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.06}
          outlineColor="#000000"
          font={undefined}
        >
          {'目标A'}
          <meshBasicMaterial
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </Text>
      </Billboard>
    </group>
  );
}

// ── Target A trajectory line ───────────────────────────────────────────

function TargetATrajectory() {
  const { geometry, material } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(TARGET_A_PATH, false, 'centripetal', 0.5);
    const points = curve.getPoints(100);
    const geo = new THREE.BufferGeometry().setFromPoints(points);

    const mat = new THREE.LineBasicMaterial({
      color: '#ff8833',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      linewidth: 1,
    });
    return { geometry: geo, material: mat };
  }, []);

  const lineObj = useMemo(() => {
    const l = new THREE.Line(geometry, material);
    l.visible = false;
    l.frustumCulled = false;
    return l;
  }, [geometry, material]);

  useFrame(() => {
    const progress = useTimelineStore.getState().storyProgress;
    lineObj.visible = progress > 0.35;
  });

  return <primitive object={lineObj} />;
}

// ── Composite ───────────────────────────────────────────────────────────

export function IconicMarkers() {
  return (
    <group>
      <EarthMarker />
      <TargetATrajectory />
      <TargetAMarker />
    </group>
  );
}
