import { describe, it, expect } from 'vitest';
import { auToTravelTimeHours, auDistanceBetween, heliocentricAU } from '../orbitalMechanics';
import type { Location } from '@/schema/location.schema';
import locationsRaw from '@/data/locations.json';

const locations = locationsRaw as unknown as Location[];
const locationsById = new Map(locations.map((l) => [l.id, l]));

// Within 1% of the canon tables — the canon documents themselves round to
// one decimal, so this tolerance just absorbs that rounding.
function expectCloseToCanon(actual: number, canonValue: number) {
  expect(actual).toBeGreaterThan(canonValue * 0.99);
  expect(actual).toBeLessThan(canonValue * 1.01);
}

describe('auToTravelTimeHours (brachistochrone)', () => {
  // Source: Informe de Geografía Humana, sec. 1.1 / Manual de Ingeniería del
  // Sistema Sol / Manual Técnico de Operaciones de Tripulación, Apéndice A.
  it('matches canon Tierra-Marte (0.52 AU) at every documented G level', () => {
    expectCloseToCanon(auToTravelTimeHours(0.52, 0.3), 90.4);
    expectCloseToCanon(auToTravelTimeHours(0.52, 1.0), 49.5);
    expectCloseToCanon(auToTravelTimeHours(0.52, 7.0), 18.7);
  });

  it('matches canon Tierra-Ceres (1.77 AU)', () => {
    expectCloseToCanon(auToTravelTimeHours(1.77, 0.3), 166.7);
    expectCloseToCanon(auToTravelTimeHours(1.77, 1.0), 91.3);
  });

  it('matches canon Marte-Ceres (1.24 AU)', () => {
    expectCloseToCanon(auToTravelTimeHours(1.24, 0.3), 139.6);
    expectCloseToCanon(auToTravelTimeHours(1.24, 1.0), 76.4);
  });

  it('matches canon Ceres-Júpiter (2.44 AU)', () => {
    expectCloseToCanon(auToTravelTimeHours(2.44, 0.3), 195.8);
    expectCloseToCanon(auToTravelTimeHours(2.44, 1.0), 107.2);
  });

  it('returns 0 for zero or negative distance', () => {
    expect(auToTravelTimeHours(0, 0.3)).toBe(0);
    expect(auToTravelTimeHours(-1, 0.3)).toBe(0);
  });
});

describe('heliocentricAU + auDistanceBetween (using real locations.json)', () => {
  it('resolves a top-level planet to its own AU value', () => {
    expect(heliocentricAU('earth', locationsById)).toBeCloseTo(1.0);
    expect(heliocentricAU('mars', locationsById)).toBeCloseTo(1.52);
  });

  it('resolves a moon to its parent planet AU value', () => {
    // Ganymede orbits Jupiter — its heliocentric distance for travel-time
    // purposes is approximated as Jupiter's own AU distance.
    expect(heliocentricAU('ganymede', locationsById)).toBeCloseTo(5.2);
  });

  it('resolves a settlement two levels deep (settlement -> moon -> planet)', () => {
    // Port Hampton -> Callisto -> Jupiter
    expect(heliocentricAU('port-hampton', locationsById)).toBeCloseTo(5.2);
  });

  it('computes Earth-Mars distance matching canon 0.52 AU', () => {
    expect(auDistanceBetween('earth', 'mars', locationsById)).toBeCloseTo(0.52, 2);
  });

  it('computes Earth-Ceres distance matching canon 1.77 AU', () => {
    expect(auDistanceBetween('earth', 'ceres', locationsById)).toBeCloseTo(1.77, 2);
  });
});
