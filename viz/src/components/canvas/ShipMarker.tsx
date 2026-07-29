/**
 * ShipMarker — marker for a single ship instance in the system-frame scene.
 *
 * Interactive: hover highlights it, click selects it (stopPropagation so a
 * click near/on the ship doesn't fall through to an overlapping
 * LocationMarker underneath — this was the actual bug reported: ShipMarker
 * originally had NO pointer handlers at all, so every click near a docked
 * ship resolved to the location instead).
 */

import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import type { Ship } from '@/schema/ship.schema';

interface ShipMarkerProps {
  ship: Ship;
  position: [number, number, number];
  onSelect?: (ship: Ship) => void;
}

export function ShipMarker({ ship, position, onSelect }: ShipMarkerProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // Gentle idle rotation — purely cosmetic, signals "this is a ship, not a station"
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.4;
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(ship);
      }}
    >
      <group ref={groupRef}>
        <mesh scale={hovered ? 0.26 : 0.2}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#88ccff"
            emissiveIntensity={hovered ? 2.8 : 1.8}
            toneMapped={false}
            metalness={0.7}
            roughness={0.25}
          />
        </mesh>
        {/* Invisible, slightly larger hit-target sphere — makes the ship
            easier to click without needing to hit the small octahedron
            exactly, especially when zoomed out. */}
        <mesh visible={false}>
          <sphereGeometry args={[0.32, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      <Billboard>
        <Text
          position={[0, 0.36, 0]}
          fontSize={hovered ? 0.19 : 0.16}
          color={hovered ? '#ffffff' : '#bbe0ff'}
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
