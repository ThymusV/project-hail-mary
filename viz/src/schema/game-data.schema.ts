/**
 * Aggregate schema for the full game dataset. Mirrors TimelineDataSchema
 * from the base repo: validates cross-referential integrity between
 * ships, weapons and factions (equivalent to how the original validates
 * that every event.sceneId references a real scene).
 */

import { z } from 'zod';
import { ShipCatalogSchema } from './ship.schema';
import { WeaponCatalogSchema } from './weapon.schema';
import { FactionCatalogSchema } from './faction.schema';
import { LocationCatalogSchema } from './location.schema';

export const GameDataSchema = z
  .object({
    ships: ShipCatalogSchema,
    weapons: WeaponCatalogSchema,
    factions: FactionCatalogSchema,
    locations: LocationCatalogSchema,
  })
  .check(
    z.superRefine((data, ctx) => {
      const weaponIds = new Set(data.weapons.map((w) => w.id));
      const factionIds = new Set(data.factions.map((f) => f.id));

      for (const ship of data.ships) {
        // Every weaponId mounted on a ship must exist in the weapon catalog
        for (const mount of ship.weapons) {
          if (!weaponIds.has(mount.weaponId)) {
            ctx.issues.push({
              code: 'custom',
              message: `Ship "${ship.id}" references unknown weaponId "${mount.weaponId}"`,
              input: data,
              path: ['ships'],
              inst: null as never,
            });
          }
        }
        // factionId, when set, must exist in the faction catalog
        if (ship.factionId !== null && !factionIds.has(ship.factionId)) {
          ctx.issues.push({
            code: 'custom',
            message: `Ship "${ship.id}" references unknown factionId "${ship.factionId}"`,
            input: data,
            path: ['ships'],
            inst: null as never,
          });
        }
      }

      for (const location of data.locations) {
        if (location.factionId !== null && !factionIds.has(location.factionId)) {
          ctx.issues.push({
            code: 'custom',
            message: `Location "${location.id}" references unknown factionId "${location.factionId}"`,
            input: data,
            path: ['locations'],
            inst: null as never,
          });
        }
      }
    }),
  );

export type GameData = z.infer<typeof GameDataSchema>;

export function validateGameData(data: unknown): GameData {
  const result = GameDataSchema.safeParse(data);
  if (result.success) return result.data;
  const messages = result.error.issues.map(
    (issue) => `  [${issue.path.join('.') || '(root)'}] ${issue.message}`,
  );
  throw new Error(`Game data validation failed:\n${messages.join('\n')}`);
}
