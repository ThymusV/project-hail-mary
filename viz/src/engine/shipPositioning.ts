/**
 * shipPositioning — resolves the current 3D position of a ShipInstance,
 * either docked at a location or interpolated along an active transit.
 *
 * SIMPLIFICATION: transit is rendered as straight-line linear interpolation
 * between the resolved (log-compressed) scene positions of the origin and
 * destination, not a true brachistochrone arc. Travel TIME is physically
 * modeled (see orbitalMechanics.ts); travel PATH shape is a visual
 * simplification — reasonable for Fase 1, revisit if/when tactical transit
 * visuals matter more than they do for "navegable, sin gameplay".
 */

import type { ShipInstance } from '@/schema/ship-instance.schema';
import type { ResolvedPosition } from './orbitalLayout';

/**
 * Fixed distance (scene units) a docked ship sits away from its location's
 * own marker position. Needs to clear LocationMarker's largest interactive
 * radius (~0.36 for a planet's ring) plus ShipMarker's own hit-sphere
 * (~0.32) so the two never overlap and both stay independently clickable.
 */
const DOCKING_OFFSET_DISTANCE = 0.7;

function hashStringToAngle(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (((hash >>> 0) % 100_000) / 100_000) * Math.PI * 2;
}

/** Deterministic offset for a docked ship, so multiple ships at the same
 * location (Fase 3: NPCs) don't stack on the exact same point either. */
function dockingOffset(shipId: string): [number, number, number] {
  const angle = hashStringToAngle(shipId);
  return [
    Math.cos(angle) * DOCKING_OFFSET_DISTANCE,
    0.2,
    Math.sin(angle) * DOCKING_OFFSET_DISTANCE,
  ];
}

export function resolveShipInstancePosition(
  ship: ShipInstance,
  locationPositions: Map<string, ResolvedPosition>,
  elapsedHours: number,
): [number, number, number] {
  if (ship.status === 'docked' && ship.currentLocationId) {
    const base = locationPositions.get(ship.currentLocationId)?.position ?? [0, 0, 0];
    const offset = dockingOffset(ship.id);
    return [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]];
  }

  if (ship.status === 'in-transit' && ship.transit) {
    const from = locationPositions.get(ship.transit.fromLocationId)?.position ?? [0, 0, 0];
    const to = locationPositions.get(ship.transit.toLocationId)?.position ?? [0, 0, 0];
    const { departureHours, arrivalHours } = ship.transit;
    const span = arrivalHours - departureHours;
    const progress = span > 0 ? Math.max(0, Math.min(1, (elapsedHours - departureHours) / span)) : 1;

    return [
      from[0] + (to[0] - from[0]) * progress,
      from[1] + (to[1] - from[1]) * progress,
      from[2] + (to[2] - from[2]) * progress,
    ];
  }

  return [0, 0, 0];
}

/** 0-1 progress of the current transit, or null if not in transit. */
export function transitProgress(ship: ShipInstance, elapsedHours: number): number | null {
  if (ship.status !== 'in-transit' || !ship.transit) return null;
  const { departureHours, arrivalHours } = ship.transit;
  const span = arrivalHours - departureHours;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (elapsedHours - departureHours) / span));
}
