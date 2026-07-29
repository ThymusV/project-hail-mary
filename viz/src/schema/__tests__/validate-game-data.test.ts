import { describe, it, expect } from 'vitest';
import { GameDataSchema } from '../game-data.schema';
import ships from '../../data/ships.json';
import weapons from '../../data/weapons.json';
import factions from '../../data/factions.json';
import locations from '../../data/locations.json';

describe('game data validation (ships/weapons/factions/locations)', () => {
  it('passes full Zod schema validation, including cross-references', () => {
    const result = GameDataSchema.safeParse({ ships, weapons, factions, locations });
    if (!result.success) {
      for (const issue of result.error.issues.slice(0, 20)) {
        console.log(JSON.stringify({ path: issue.path.join('.'), code: issue.code, msg: issue.message }));
      }
      expect.fail(`Validation failed with ${result.error.issues.length} issues (see above)`);
    }
    expect(result.data.ships.length).toBeGreaterThanOrEqual(14);
    expect(result.data.weapons.length).toBeGreaterThanOrEqual(5);
    expect(result.data.factions.length).toBeGreaterThanOrEqual(11);
    expect(result.data.locations.length).toBeGreaterThanOrEqual(31);
  });

  it('flags documentation gaps explicitly instead of hiding them', () => {
    const result = GameDataSchema.safeParse({ ships, weapons, factions, locations });
    if (!result.success) expect.fail('schema must parse for this test to be meaningful');
    const incomplete = result.data.ships.filter((s) => !s.statsComplete);
    // Known gaps per Análisis de Cobertura Documental: Donnager, Asp, Corvette, Phantom, Butin d'Abzu
    expect(incomplete.length).toBe(5);
    for (const ship of incomplete) {
      expect(ship.notes, `ship "${ship.id}" has statsComplete=false but no explanatory note`).toBeTruthy();
    }
  });

  it('every non-canon entry documents why it was added', () => {
    const result = GameDataSchema.safeParse({ ships, weapons, factions, locations });
    if (!result.success) expect.fail('schema must parse for this test to be meaningful');
    const nonCanon = [...result.data.ships, ...result.data.weapons, ...result.data.locations].filter(
      (x) => !x.isCanon,
    );
    for (const entry of nonCanon) {
      expect(entry.notes, `non-canon entry "${entry.id}" must explain its rationale in notes`).toBeTruthy();
    }
  });

  it('does not use the IP-bearing name "Estación Tycho"', () => {
    const result = GameDataSchema.safeParse({ ships, weapons, factions, locations });
    if (!result.success) expect.fail('schema must parse for this test to be meaningful');
    const names = result.data.locations.map((l) => l.name.toLowerCase());
    expect(names).not.toContain('estación tycho');
    expect(names).not.toContain('estacion tycho');
  });
});
