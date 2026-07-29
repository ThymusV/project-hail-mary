/**
 * orbitalLayout — positions every Location from locations.json in 3D space,
 * within the "system" coordinate frame (0.01 AU per unit, see types/coordinates.ts).
 *
 * DESIGN DECISION (confirmed with the project owner): real AU distances,
 * log-compressed so the whole system fits in a navigable scene. This is
 * NOT true ephemeris — angles are deterministic-but-arbitrary (hashed from
 * id), not real planetary positions on any specific date. Consistent with
 * the project's earlier decision to simplify orbital mechanics for
 * gameplay (Kepler fijo / brachistocrona) rather than simulate real orbits.
 *
 * Two position modes, resolved recursively via `parentBody`:
 *   1. Top-level bodies (parentBody === null): placed on a circle around
 *      the Sun at `auToSceneRadius(AU)`, at a hashed angle.
 *   2. Child bodies (parentBody !== null): placed at a small local offset
 *      from their resolved parent position. The local offset is NOT to
 *      real relative scale (a real moon-planet distance would be an
 *      invisible fraction of a pixel at this zoom level) — it's a fixed,
 *      type-dependent radius chosen for on-screen legibility.
 *
 * Special case: "yonque-de-troyanos" represents a Jupiter Trojan asteroid
 * field. Real Trojans co-orbit the Sun at ~Jupiter's distance, offset by
 * ~60° (the L4/L5 Lagrange points) — they do NOT orbit Jupiter locally.
 * We honor that real orbital-mechanics fact even though Jupiter's own
 * angle here is arbitrary, not ephemeris-accurate.
 */

import type { Location } from '@/schema/location.schema';

// ---------------------------------------------------------------------------
// AU distances for top-level bodies (parentBody === null)
// ---------------------------------------------------------------------------

/**
 * Real semi-major axis in AU for actual planets/dwarf planets.
 * For the invented belt locations (no real body to anchor to), a
 * hand-picked AU value within the real asteroid belt range (~2.1–3.3 AU)
 * spreads them out visually without claiming ephemeris accuracy.
 */
export const TOP_LEVEL_AU: Record<string, number> = {
  earth: 1.0,
  mars: 1.52,
  jupiter: 5.2,
  saturn: 9.58,
  uranus: 19.18,
  neptune: 30.07,
  ceres: 2.77, // real
  'deriva-kessler': 2.2,
  'refineria-punta-basalto': 2.4,
  'anexo-7': 2.6,
  'estacion-zafra': 2.9,
  'faro-roto': 3.1,
  'estacion-forja': 3.3,
};

/** Local orbit radius (scene units) for a child body around its parent, by type. */
const LOCAL_ORBIT_RADIUS: Record<string, number> = {
  moon: 1.4,
  station: 0.5,
  settlement: 0.45,
  outpost: 0.5,
  'asteroid-field': 1.4, // only used for yonque-de-troyanos, see special-case below
  planet: 0, // unused, planets are always top-level
  'dwarf-planet': 0,
};

// ---------------------------------------------------------------------------
// Deterministic hash → angle (radians), so layout is stable across runs
// without needing to hand-tune one magic number per location.
// ---------------------------------------------------------------------------

function hashStringToUnitInterval(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  // Map signed 32-bit hash to [0, 1)
  return ((hash >>> 0) % 100_000) / 100_000;
}

function hashStringToAngle(id: string): number {
  return hashStringToUnitInterval(id) * Math.PI * 2;
}

// ---------------------------------------------------------------------------
// AU → scene units (log compression)
// ---------------------------------------------------------------------------

/** Tuning constant: Neptune (30.07 AU) lands at ~30 scene units. */
const LOG_SCALE = 20;

export function auToSceneRadius(au: number): number {
  return LOG_SCALE * Math.log10(au + 1);
}

// ---------------------------------------------------------------------------
// Position resolution
// ---------------------------------------------------------------------------

export interface ResolvedPosition {
  position: [number, number, number];
  /** Scene-unit distance from the Sun; used for orbit ring radius on top-level bodies. */
  orbitRadius: number;
}

/**
 * Resolves the 3D position of every location in `locations`, keyed by id.
 * Handles arbitrary parent depth (e.g. settlement → moon → planet → Sun)
 * via memoized recursion, with a cycle guard for safety.
 */
export function resolveLocationPositions(
  locations: Location[],
): Map<string, ResolvedPosition> {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const resolved = new Map<string, ResolvedPosition>();
  const inProgress = new Set<string>();

  function resolve(id: string): ResolvedPosition {
    const cached = resolved.get(id);
    if (cached) return cached;

    if (inProgress.has(id)) {
      // Defensive: cyclic parentBody chain. Should never happen (schema
      // doesn't forbid it, but our data doesn't have cycles) — fall back
      // to the origin rather than infinite-looping.
      const fallback: ResolvedPosition = { position: [0, 0, 0], orbitRadius: 0 };
      resolved.set(id, fallback);
      return fallback;
    }

    const location = byId.get(id);
    if (!location) {
      const fallback: ResolvedPosition = { position: [0, 0, 0], orbitRadius: 0 };
      resolved.set(id, fallback);
      return fallback;
    }

    inProgress.add(id);

    let result: ResolvedPosition;

    if (location.parentBody === null) {
      // Top-level: circle around the Sun
      const au = TOP_LEVEL_AU[id] ?? 2.5; // fallback for any future body we forget to tune
      const radius = auToSceneRadius(au);
      const angle = hashStringToAngle(id);
      result = {
        position: [radius * Math.cos(angle), 0, radius * Math.sin(angle)],
        orbitRadius: radius,
      };
    } else {
      const parent = resolve(location.parentBody);

      if (id === 'yonque-de-troyanos') {
        // Special case: Jupiter Trojans co-orbit the Sun at ~Jupiter's
        // distance, offset ~60° (L4/L5) — not a local orbit of Jupiter.
        const parentAngle = Math.atan2(parent.position[2], parent.position[0]);
        const angle = parentAngle + Math.PI / 3; // +60°
        const radius = parent.orbitRadius;
        result = {
          position: [radius * Math.cos(angle), 0, radius * Math.sin(angle)],
          orbitRadius: radius,
        };
      } else {
        const localRadius = LOCAL_ORBIT_RADIUS[location.type] ?? 0.5;
        const angle = hashStringToAngle(id);
        // Slight vertical offset so child markers aren't perfectly coplanar
        // with the parent's orbital plane — purely cosmetic legibility aid.
        const yOffset = (hashStringToUnitInterval(id + ':y') - 0.5) * 0.3;
        result = {
          position: [
            parent.position[0] + localRadius * Math.cos(angle),
            parent.position[1] + yOffset,
            parent.position[2] + localRadius * Math.sin(angle),
          ],
          orbitRadius: parent.orbitRadius,
        };
      }
    }

    inProgress.delete(id);
    resolved.set(id, result);
    return result;
  }

  for (const location of locations) {
    resolve(location.id);
  }

  return resolved;
}
