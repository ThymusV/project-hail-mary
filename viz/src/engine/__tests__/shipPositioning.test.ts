import { describe, it, expect } from 'vitest';
import { resolveShipInstancePosition } from '../shipPositioning';
import type { ShipInstance } from '@/schema/ship-instance.schema';
import type { ResolvedPosition } from '../orbitalLayout';

const locationPositions = new Map<string, ResolvedPosition>([
  ['ceres', { position: [5, 0, 3], orbitRadius: 5.83 }],
  ['mars', { position: [8, 0, 1], orbitRadius: 8.06 }],
]);

describe('resolveShipInstancePosition — docking offset regression', () => {
  // Bug this guards against: a docked ship rendered at the EXACT same
  // coordinates as its location, making it visually/click-wise
  // indistinguishable from the LocationMarker underneath (reported by the
  // project owner: "no puedo seleccionar la nave... se confunde con dicho
  // punto"). The fix adds a fixed, non-zero offset for docked ships.
  it('never places a docked ship at the exact same position as its location', () => {
    const ship: ShipInstance = {
      id: 'player-ship-01',
      name: 'Anne Bonny',
      classId: 'anne-bonny',
      factionId: null,
      isPlayerControlled: true,
      status: 'docked',
      currentLocationId: 'ceres',
      transit: null,
    };

    const shipPos = resolveShipInstancePosition(ship, locationPositions, 0);
    const locationPos = locationPositions.get('ceres')!.position;

    const distance = Math.hypot(
      shipPos[0] - locationPos[0],
      shipPos[1] - locationPos[1],
      shipPos[2] - locationPos[2],
    );
    expect(distance).toBeGreaterThan(0.3); // clears both markers' interactive radii
  });

  it('gives different ships at the same location different offsets (no exact stacking)', () => {
    const shipA: ShipInstance = {
      id: 'ship-a',
      name: 'A',
      classId: 'anne-bonny',
      factionId: null,
      isPlayerControlled: false,
      status: 'docked',
      currentLocationId: 'ceres',
      transit: null,
    };
    const shipB: ShipInstance = { ...shipA, id: 'ship-b', name: 'B' };

    const posA = resolveShipInstancePosition(shipA, locationPositions, 0);
    const posB = resolveShipInstancePosition(shipB, locationPositions, 0);

    expect(posA).not.toEqual(posB);
  });

  it('is deterministic — same ship id always gets the same docking offset', () => {
    const ship: ShipInstance = {
      id: 'player-ship-01',
      name: 'Anne Bonny',
      classId: 'anne-bonny',
      factionId: null,
      isPlayerControlled: true,
      status: 'docked',
      currentLocationId: 'mars',
      transit: null,
    };
    const first = resolveShipInstancePosition(ship, locationPositions, 0);
    const second = resolveShipInstancePosition(ship, locationPositions, 0);
    expect(first).toEqual(second);
  });
});
