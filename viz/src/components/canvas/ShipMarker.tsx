/**
 * ShipMarker — static marker for a single ship (Fase 0 milestone: "una nave,
 * sin gameplay"). No trajectory-following yet; just a visible, identifiable
 * presence in the system-frame scene. Movement/navigation is a later phase.
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import type { Ship } from '@/schema/ship.schema';

interface ShipMarkerProps {
  ship: Ship;
  position: [number, number, number];
}

export function ShipMarker({ ship, position }: ShipMarkerProps) {
  const groupRef = useRef<THREE.Group>(null!);

  // Gentle idle rotation — purely cosmetic, signals "this is a ship, not a station"
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.4;
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        <mesh scale={0.18}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#88ccff"
            emissiveIntensity={1.8}
            toneMapped={false}
            metalness={0.7}
            roughness={0.25}
          />
        </mesh>
      </group>

      <Billboard>
        <Text
          position={[0, 0.32, 0]}
          fontSize={0.16}
          color="#bbe0ff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.012}
          outlineColor="#000000"
        >
          {ship.name}
          <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} />
        </Text>
      </Billboard>
    </group>
  );
}
