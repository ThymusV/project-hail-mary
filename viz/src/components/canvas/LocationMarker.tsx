/**
 * LocationMarker — generic, data-driven marker for a single Location.
 *
 * Visual language borrowed from IconicMarkers.EarthMarker (emissive sphere +
 * orbital ring + Billboard label), but parameterized by location type/region
 * instead of hardcoded to one narrative beat.
 *
 * Labels: always visible for planet/dwarf-planet (the 7 major bodies —
 * keeps the scene legible at a glance). Everything else shows its label
 * only on hover/pointer-over, to avoid cluttering the view with 31 labels
 * at once.
 */

import { useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import type { Location, LocationType } from '@/schema/location.schema';

// ── Visual config by type ───────────────────────────────────────────────

const TYPE_COLOR: Record<LocationType, string> = {
  planet: '#3366cc',
  'dwarf-planet': '#8899aa',
  moon: '#aabbcc',
  station: '#ffaa33',
  settlement: '#33cc99',
  outpost: '#cc6644',
  'asteroid-field': '#887766',
};

const TYPE_RADIUS: Record<LocationType, number> = {
  planet: 0.28,
  'dwarf-planet': 0.16,
  moon: 0.12,
  station: 0.09,
  settlement: 0.1,
  outpost: 0.08,
  'asteroid-field': 0.1,
};

const ALWAYS_LABELED_TYPES: LocationType[] = ['planet', 'dwarf-planet'];

// ── Component ────────────────────────────────────────────────────────────

interface LocationMarkerProps {
  location: Location;
  position: [number, number, number];
  onSelect?: (location: Location) => void;
}

export function LocationMarker({ location, position, onSelect }: LocationMarkerProps) {
  const [hovered, setHovered] = useState(false);

  const color = TYPE_COLOR[location.type];
  const radius = TYPE_RADIUS[location.type];
  const alwaysLabeled = ALWAYS_LABELED_TYPES.includes(location.type);
  const showLabel = alwaysLabeled || hovered;

  // Non-canon (invented) locations get a dimmer ring — a subtle visual
  // cue distinguishing "our design" from "documented canon" without
  // needing a UI toggle to see it.
  const ringOpacity = location.isCanon ? 0.5 : 0.25;

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(location);
      }}
    >
      <mesh scale={hovered ? 1.3 : 1}>
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2.2 : 1.3}
          toneMapped={false}
        />
      </mesh>

      {/* Orbital/marker ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius + 0.05, radius + 0.08, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={ringOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {showLabel && (
        <Billboard>
          <Text
            position={[0, radius + 0.22, 0]}
            fontSize={alwaysLabeled ? 0.22 : 0.16}
            color={hovered ? '#ffffff' : color}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.012}
            outlineColor="#000000"
          >
            {location.name}
            <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} />
          </Text>
        </Billboard>
      )}
    </group>
  );
}
