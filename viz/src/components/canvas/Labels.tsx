/**
 * Labels -- 3D text labels for key stars.
 *
 * Billboard text using Drei <Billboard> + <Text> that always faces
 * the camera.  Star spheres remain position-fixed; only the text
 * group is billboarded.  Distance-based fade for readability.
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';

// ── Star label data ─────────────────────────────────────────────────────

interface StarLabel {
  position: [number, number, number];
  name: string;
  nameCN: string;
  /** Surface color based on spectral type */
  color: string;
  /** Emissive glow color (usually warmer than surface) */
  emissive: string;
  /** Visual radius in scene units (NOT to scale, for visibility) */
  size: number;
  /** Emissive intensity — proportional to real luminosity ratio */
  intensity: number;
}

/**
 * Astronomical reference:
 *  Sol (G2V):       Teff ~5778K, Luminosity 1.0 L☉, color index 0.63
 *  Tau Ceti (G8.5V): Teff ~5344K, Luminosity 0.52 L☉, slightly cooler/dimmer
 *  40 Eridani A (K1V): Teff ~5072K, Luminosity 0.46 L☉, noticeably orange
 */
const STAR_LABELS: StarLabel[] = [
  {
    position: [0, 0, 0],
    name: 'Sol',
    nameCN: '太阳',
    color: '#fff4e8',     // G2V warm white-yellow
    emissive: '#ffe0a0',  // warm glow
    size: 0.4,
    intensity: 3.0,       // brightest — reference star
  },
  {
    position: [11.9, 0, 0],
    name: 'Tau Ceti',
    nameCN: '鲸鱼座τ',
    color: '#ffecd0',     // G8.5V slightly cooler yellow
    emissive: '#ffd080',  // warmer, less luminous glow
    size: 0.32,           // ~0.79 R☉ (smaller than Sol)
    intensity: 1.8,       // ~0.52 L☉
  },
  {
    position: [-8, 12, 3],
    name: '40 Eridani A',
    nameCN: '波江座40',
    color: '#ffd8a8',     // K1V distinct orange-yellow
    emissive: '#ffb060',  // warm orange glow
    size: 0.28,           // ~0.81 R☉
    intensity: 1.5,       // ~0.46 L☉
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
      {/* Star sphere — physically-inspired rendering */}
      <mesh>
        <sphereGeometry args={[label.size, 32, 32]} />
        <meshStandardMaterial
          color={label.color}
          emissive={label.emissive}
          emissiveIntensity={label.intensity}
          toneMapped={false}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Text labels — billboarded so they always face camera */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
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
      </Billboard>
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
