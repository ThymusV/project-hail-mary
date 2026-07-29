/**
 * LocalSpaceScene — the "encounter" frame: real-time free-flight maneuvering
 * near a single location, closing out Fase 1's "movimiento dual" (system
 * transit + local maneuvering).
 *
 * Physics: engine/localFlight.ts (pure, unit-tested). Input:
 * hooks/useKeyboardThrustInput.ts. Both deliberately decoupled from this
 * component so they can be tested/reused without a live Canvas.
 *
 * Performance note: flight state lives in a ref, not React state — it's
 * mutated every frame inside useFrame and applied directly to the ship's
 * Object3D and the camera, avoiding a React re-render at 60fps. A small
 * piece of state (displaySpeed) IS synced, but throttled, purely to drive
 * the on-screen speed readout — not the physics itself.
 */

import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { StarField } from './StarField';
import { useKeyboardThrustInput } from '@/hooks/useKeyboardThrustInput';
import {
  stepLocalFlight,
  createInitialFlightState,
  headingVector,
  type LocalFlightState,
} from '@/engine/localFlight';
import type { LocationType } from '@/schema/location.schema';

const BODY_COLOR: Record<LocationType, string> = {
  planet: '#3366cc',
  'dwarf-planet': '#8899aa',
  moon: '#aabbcc',
  station: '#ffaa33',
  settlement: '#33cc99',
  outpost: '#cc6644',
  'asteroid-field': '#887766',
};

// ── The location body being orbited/approached, rendered up close ──────

function LocalBody({ type }: { type: LocationType }) {
  const color = BODY_COLOR[type];
  const isArtificial = type === 'station' || type === 'settlement' || type === 'outpost';
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[3, isArtificial ? 8 : 48, isArtificial ? 8 : 48]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.7} />
    </mesh>
  );
}

// ── Ship (player-controlled, ref-driven — no React re-render per frame) ─

function PlayerShip({ groupRef, thrusting }: { groupRef: React.RefObject<THREE.Group>; thrusting: boolean }) {
  return (
    <group ref={groupRef}>
      <mesh scale={0.6}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#88ccff"
          emissiveIntensity={thrusting ? 2.6 : 1.4}
          toneMapped={false}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

// ── Scene ────────────────────────────────────────────────────────────────

interface LocalSpaceSceneProps {
  locationType: LocationType;
  onExit: () => void;
}

export function LocalSpaceScene({ locationType }: LocalSpaceSceneProps) {
  const inputRef = useKeyboardThrustInput();
  const flightRef = useRef<LocalFlightState>(createInitialFlightState([0, 0, 12]));
  const shipGroupRef = useRef<THREE.Group>(null!);

  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [thrusting, setThrusting] = useState(false);
  const hudAccumulator = useRef(0);

  const cameraOffset = useMemo(() => new THREE.Vector3(), []);
  const desiredCameraPos = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30); // clamp to avoid huge steps on tab-switch lag spikes
    const input = inputRef.current;

    flightRef.current = stepLocalFlight(flightRef.current, input, dt);
    const { position, yaw, pitch, velocity } = flightRef.current;

    if (shipGroupRef.current) {
      shipGroupRef.current.position.set(...position);
      shipGroupRef.current.rotation.set(pitch, yaw, 0, 'YXZ');
    }

    // Chase camera: sits behind + above the ship's facing direction, lerped for smoothness
    const [hx, hy, hz] = headingVector(yaw, pitch);
    cameraOffset.set(-hx * 6, -hy * 6 + 2.2, -hz * 6);
    desiredCameraPos.set(position[0] + cameraOffset.x, position[1] + cameraOffset.y, position[2] + cameraOffset.z);
    state.camera.position.lerp(desiredCameraPos, 1 - Math.pow(0.001, dt));
    lookTarget.set(position[0], position[1], position[2]);
    state.camera.lookAt(lookTarget);

    // Throttled HUD update (~6x/sec) — keeps React out of the 60fps physics loop
    hudAccumulator.current += dt;
    if (hudAccumulator.current > 0.16) {
      hudAccumulator.current = 0;
      setDisplaySpeed(Math.hypot(...velocity));
      setThrusting(input.forward || input.backward || input.strafeLeft || input.strafeRight || input.ascend || input.descend);
    }
  });

  return (
    <>
      <StarField />
      <LocalBody type={locationType} />
      <PlayerShip groupRef={shipGroupRef} thrusting={thrusting} />
      <ambientLight intensity={0.25} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />

      {/* Speed readout rendered via a plain DOM overlay in App.tsx reading this
          same throttled value would duplicate state; simplest is exposing it
          on window for the HUD to read — see App.tsx LocalSpaceHud. */}
      <LocalSpaceSpeedBridge speed={displaySpeed} />
    </>
  );
}

// Bridges the throttled speed value out of the Canvas to the DOM HUD via a
// tiny custom event — avoids prop-drilling a store just for one number.
function LocalSpaceSpeedBridge({ speed }: { speed: number }) {
  useMemo(() => {
    window.dispatchEvent(new CustomEvent('local-space-speed', { detail: speed }));
  }, [speed]);
  return null;
}
