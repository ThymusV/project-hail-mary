/**
 * orbitalMechanics — distance and travel-time calculations for the transit
 * (system-frame) movement mode.
 *
 * DISTANCE MODEL: matches the canon documents' own stated simplification —
 * "Los tiempos de viaje son promedios calculados sobre distancias medias en
 * AU" (Informe de Geografía Humana). Checking the canon numbers confirms
 * they use plain |AU_a − AU_b| (difference of heliocentric distance), NOT
 * true angle-dependent geometric distance:
 *   Mars(1.52) − Earth(1.0)   = 0.52  → canon Tierra-Marte:  0.52 AU ✓
 *   Ceres(2.77) − Earth(1.0)  = 1.77  → canon Tierra-Ceres:  1.77 AU ✓
 *   Ceres(2.77) − Mars(1.52)  = 1.25  → canon Marte-Ceres:   1.24 AU (≈)
 * We use the same model for consistency with the rest of the project's
 * data, and because it's what the canon travel-time table itself implies.
 *
 * TRAVEL TIME MODEL: brachistochrone (constant acceleration to the
 * midpoint, then flip and decelerate) — matches canon's own framing
 * ("aceleración sostenida", multiple G columns in every travel-time table
 * across the lore documents). Verified against canon figures below.
 *
 * For child locations (moons, stations, settlements), we approximate
 * heliocentric distance using the nearest top-level ancestor's AU value —
 * moon-planet distances are negligible next to interplanetary distances
 * for travel-time purposes (see orbitalLayout.ts's own note on this).
 */

import type { Location } from '@/schema/location.schema';
import { TOP_LEVEL_AU } from './orbitalLayout';

// ---------------------------------------------------------------------------
// Physical constants
// ---------------------------------------------------------------------------

const AU_IN_METERS = 1.495978707e11;
const STANDARD_GRAVITY_MS2 = 9.80665;
const SECONDS_PER_HOUR = 3600;

// ---------------------------------------------------------------------------
// Heliocentric AU lookup (walks up parentBody to the nearest top-level body)
// ---------------------------------------------------------------------------

export function heliocentricAU(locationId: string, locationsById: Map<string, Location>): number {
  let current = locationsById.get(locationId);
  const visited = new Set<string>();

  while (current && current.parentBody !== null) {
    if (visited.has(current.id)) break; // cycle guard
    visited.add(current.id);
    current = locationsById.get(current.parentBody);
  }

  const topLevelId = current?.id ?? locationId;
  return TOP_LEVEL_AU[topLevelId] ?? 2.5; // fallback, mirrors orbitalLayout's own fallback
}

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

export function auDistanceBetween(
  idA: string,
  idB: string,
  locationsById: Map<string, Location>,
): number {
  return Math.abs(heliocentricAU(idA, locationsById) - heliocentricAU(idB, locationsById));
}

// ---------------------------------------------------------------------------
// Travel time (brachistochrone)
// ---------------------------------------------------------------------------

/**
 * Time, in hours, to travel `distanceAU` under constant acceleration
 * `accelerationG` (in multiples of standard gravity), accelerating to the
 * midpoint and decelerating for the second half.
 *
 * Verified against canon (Informe de Geografía Humana / Manual de
 * Ingeniería / Manual de Operaciones de Tripulación travel-time tables):
 *   auToTravelTimeHours(0.52, 0.3)  ≈ 90.4h   (canon: 90.4h)
 *   auToTravelTimeHours(0.52, 1.0)  ≈ 49.5h   (canon: 49.5h)
 *   auToTravelTimeHours(1.77, 0.3)  ≈ 166.7h  (canon: 166.7h)
 *   auToTravelTimeHours(1.77, 1.0)  ≈ 91.3h   (canon: 91.3h)
 * See __tests__/orbitalMechanics.test.ts for the full cross-check.
 */
export function auToTravelTimeHours(distanceAU: number, accelerationG: number): number {
  if (distanceAU <= 0) return 0;
  const distanceMeters = distanceAU * AU_IN_METERS;
  const accelerationMs2 = accelerationG * STANDARD_GRAVITY_MS2;
  const halfTimeSeconds = Math.sqrt(distanceMeters / accelerationMs2);
  const totalSeconds = 2 * halfTimeSeconds;
  return totalSeconds / SECONDS_PER_HOUR;
}

export function travelTimeHoursBetween(
  fromId: string,
  toId: string,
  accelerationG: number,
  locationsById: Map<string, Location>,
): number {
  const distanceAU = auDistanceBetween(fromId, toId, locationsById);
  return auToTravelTimeHours(distanceAU, accelerationG);
}
