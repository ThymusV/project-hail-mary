/**
 * Labels — 3D text labels for key stars.
 *
 * Billboard text using Drei <Text> that fades based on distance
 * from camera. Semi-transparent background plane behind each label.
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// ── Star label data ─────────────────────────────────────────────────────

interface StarLabel {
  position: [number, number, number];
  name: string;
  nameCN: string;
  color: string;
  size: number;
}

const STAR_LABELS: StarLabel[] = [
  {
    position: [0, 0, 0],
    name: 'Sol',
    nameCN: '太阳',
    color: '#fff4ea',
    size: 0.35,
  },
  {
    position: [11.9, 0, 0],
    name: 'Tau Ceti',
    nameCN: '鲸鱼座Tau',
    color: '#fff4ea',
    size: 0.35,
  },
  {
    position: [-8, 12, 3],
    name: '40 Eridani',
    nameCN: '波江座40',
    color: '#ffd2a1',
    size: 0.35,
  },
];

// ── Fade parameters ─────────────────────────────────────────────────────

const FADE_NEAR = 2;   // full opacity when closer than this
const FADE_FAR = 60;   // fully invisible beyond this

// ── Single label component ──────────────────────────────────────────────

function StarLabelItem({ label }: { label: StarLabel }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  const _camPos = useRef(new THREE.Vector3());
  const _labelPos = useRef(new THREE.Vector3(...label.position));

  useFrame(() => {
    if (!groupRef.current) return;

    _camPos.current.copy(camera.position);
    const dist = _camPos.current.distanceTo(_labelPos.current);

    // Distance-based fade
    const alpha = 1 - THREE.MathUtils.smoothstep(dist, FADE_NEAR, FADE_FAR);

    // Apply to group visibility
    groupRef.current.visible = alpha > 0.01;

    // Update children opacity
    groupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.opacity !== undefined) {
          mat.opacity = alpha;
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={label.position}>
      {/* Emissive star sphere */}
      <mesh>
        <sphereGeometry args={[label.size, 16, 16]} />
        <meshStandardMaterial
          color={label.color}
          emissive={label.color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* English name */}
      <Text
        position={[0, label.size + 0.6, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
        fillOpacity={1}
        font={undefined}
      >
        {label.name}
        <meshBasicMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </Text>

      {/* Chinese name */}
      <Text
        position={[0, label.size + 0.15, 0]}
        fontSize={0.35}
        color="#c8c8dc"
        fillOpacity={0.8}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.015}
        outlineColor="#000000"
        font={undefined}
      >
        {label.nameCN}
        <meshBasicMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </Text>
    </group>
  );
}

// ── Composite ───────────────────────────────────────────────────────────

export function Labels() {
  return (
    <group>
      {STAR_LABELS.map((label) => (
        <StarLabelItem key={label.name} label={label} />
      ))}
    </group>
  );
}
