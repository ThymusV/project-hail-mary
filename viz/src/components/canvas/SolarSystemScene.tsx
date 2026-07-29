/**
 * SolarSystemScene — Fase 1: movement is now real. Renders the `system`
 * coordinate frame: all locations from locations.json, plus every ship
 * instance from useShipInstancesStore (docked or interpolating along an
 * active transit, per engine/shipPositioning.ts). Drives the world clock
 * every frame (see engine/orbitalMechanics.ts for the travel-time model).
 *
 * Camera: free orbit/pan/zoom via drei's CameraControls. No scripted
 * "camera shots" here — there's no story to scrub through in this frame,
 * unlike the interstellar scene's storyProgress-driven CameraRig.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { StarField } from './StarField';
import { LocationMarker } from './LocationMarker';
import { ShipMarker } from './ShipMarker';
import { resolveLocationPositions } from '@/engine/orbitalLayout';
import { resolveShipInstancePosition } from '@/engine/shipPositioning';
import { useWorldClockStore } from '@/stores/useWorldClockStore';
import { useShipInstancesStore } from '@/stores/useShipInstancesStore';
import type { Location } from '@/schema/location.schema';
import type { Ship } from '@/schema/ship.schema';

// ── Sun ──────────────────────────────────────────────────────────────────

function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#fff4d6" emissive="#ffdd88" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2.5} color="#fff4ea" distance={80} decay={1.5} />
    </group>
  );
}

// ── Orbit ring for top-level bodies ─────────────────────────────────────

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 128]} />
      <meshBasicMaterial color="#556677" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── World clock driver (advances the game clock every render frame) ─────

function WorldClockDriver({ locationsById }: { locationsById: Map<string, Location> }) {
  const tick = useWorldClockStore((s) => s.tick);
  const resolveArrivals = useShipInstancesStore((s) => s.resolveArrivals);
  const lastElapsedRef = useRef(0);

  useFrame((_, delta) => {
    tick(delta);
    const elapsed = useWorldClockStore.getState().elapsedHours;
    // Only worth checking arrivals if time actually advanced (paused = timeScale 0)
    if (elapsed !== lastElapsedRef.current) {
      lastElapsedRef.current = elapsed;
      resolveArrivals(elapsed);
    }
  });

  void locationsById; // reserved: NPC transit will need this once Fase 3 lands
  return null;
}

// ── Scene ────────────────────────────────────────────────────────────────

interface SolarSystemSceneProps {
  locations: Location[];
  shipClasses: Ship[];
  onSelectLocation?: (location: Location) => void;
}

export function SolarSystemScene({ locations, shipClasses, onSelectLocation }: SolarSystemSceneProps) {
  const positions = useMemo(() => resolveLocationPositions(locations), [locations]);
  const locationsById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const shipClassesById = useMemo(() => new Map(shipClasses.map((c) => [c.id, c])), [shipClasses]);

  const shipInstances = useShipInstancesStore((s) => s.ships);
  const elapsedHours = useWorldClockStore((s) => s.elapsedHours);

  const topLevelOrbitRadii = useMemo(() => {
    const radii = new Set<number>();
    for (const location of locations) {
      if (location.parentBody === null) {
        const resolved = positions.get(location.id);
        if (resolved) radii.add(Math.round(resolved.orbitRadius * 1000) / 1000);
      }
    }
    return Array.from(radii);
  }, [locations, positions]);

  return (
    <>
      <StarField />
      <Sun />
      <WorldClockDriver locationsById={locationsById} />

      {topLevelOrbitRadii.map((r) => (
        <OrbitRing key={r} radius={r} />
      ))}

      {locations.map((location) => {
        const resolved = positions.get(location.id);
        if (!resolved) return null;
        return (
          <LocationMarker
            key={location.id}
            location={location}
            position={resolved.position}
            onSelect={onSelectLocation}
          />
        );
      })}

      {shipInstances.map((ship) => {
        const shipClass = shipClassesById.get(ship.classId);
        if (!shipClass) return null;
        const position = resolveShipInstancePosition(ship, positions, elapsedHours);
        return <ShipMarker key={ship.id} ship={shipClass} position={position} />;
      })}

      <ambientLight intensity={0.12} />

      <CameraControls makeDefault minDistance={1} maxDistance={90} />
    </>
  );
}
