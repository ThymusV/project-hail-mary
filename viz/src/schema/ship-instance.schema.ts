/**
 * Zod schema for ShipInstance — a concrete ship that exists in the game
 * world, as opposed to a Ship (class/template) from ship.schema.ts.
 *
 * This is the first piece of the "world state" layer described in the
 * architecture doc, section 2.8: catalog data (ships.json) describes what
 * a ship class CAN be; ShipInstance describes an actual ship, where it is,
 * who owns it, and what it's doing right now.
 *
 * Fase 1 scope: only the player's ship exists as an instance, docked or
 * in transit between locations. Fase 3 (motor de simulación de mundo
 * abierto) will populate many NPC instances and drive them via factionAI.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// ShipInstanceStatus
// ---------------------------------------------------------------------------

export const SHIP_INSTANCE_STATUSES = ['docked', 'in-transit'] as const;
export const ShipInstanceStatusSchema = z.enum(SHIP_INSTANCE_STATUSES);
export type ShipInstanceStatus = z.infer<typeof ShipInstanceStatusSchema>;

// ---------------------------------------------------------------------------
// TransitPlan — present only while status === 'in-transit'
// ---------------------------------------------------------------------------

export const TransitPlanSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  /** Acceleration for this burn, in multiples of standard gravity (matches canon tables: 0.3/1.0/7.0/12.0) */
  accelerationG: z.number().positive(),
  /** Game-clock hours (useWorldClockStore.elapsedHours) at departure */
  departureHours: z.number().nonnegative(),
  /** Game-clock hours at which this ship arrives at toLocationId */
  arrivalHours: z.number().nonnegative(),
});

export type TransitPlan = z.infer<typeof TransitPlanSchema>;

// ---------------------------------------------------------------------------
// ShipInstance
// ---------------------------------------------------------------------------

export const ShipInstanceSchema = z
  .object({
    /** Unique instance identifier, kebab-case (distinct from Ship.id, the class) */
    id: z.string().min(1),
    /** Individual name — defaults to the class name but can be player-renamed */
    name: z.string().min(1),
    /** Must match a Ship.id from ships.json — this instance's class/template */
    classId: z.string().min(1),
    /** Must match a Faction.id from factions.json, or null if unaffiliated (pirates, mercs) */
    factionId: z.string().min(1).nullable(),
    /** true only for the ship(s) under direct player control */
    isPlayerControlled: z.boolean().default(false),
    status: ShipInstanceStatusSchema,
    /** Required when status === 'docked': which Location.id this ship sits at */
    currentLocationId: z.string().min(1).nullable(),
    /** Required when status === 'in-transit' */
    transit: TransitPlanSchema.nullable(),
  })
  .check(
    z.superRefine((instance, ctx) => {
      if (instance.status === 'docked' && instance.currentLocationId === null) {
        ctx.issues.push({
          code: 'custom',
          message: `Ship instance "${instance.id}" is docked but has no currentLocationId`,
          input: instance,
          path: ['currentLocationId'],
          inst: null as never,
        });
      }
      if (instance.status === 'in-transit' && instance.transit === null) {
        ctx.issues.push({
          code: 'custom',
          message: `Ship instance "${instance.id}" is in-transit but has no transit plan`,
          input: instance,
          path: ['transit'],
          inst: null as never,
        });
      }
      if (
        instance.status === 'in-transit' &&
        instance.transit !== null &&
        instance.transit.arrivalHours <= instance.transit.departureHours
      ) {
        ctx.issues.push({
          code: 'custom',
          message: `Ship instance "${instance.id}" has arrivalHours <= departureHours`,
          input: instance,
          path: ['transit'],
          inst: null as never,
        });
      }
    }),
  );

export type ShipInstance = z.infer<typeof ShipInstanceSchema>;

// ---------------------------------------------------------------------------
// ShipInstanceCatalog (used for the initial-world-state seed file)
// ---------------------------------------------------------------------------

export const ShipInstanceCatalogSchema = z.array(ShipInstanceSchema).check(
  z.superRefine((instances, ctx) => {
    const ids = new Set<string>();
    for (const inst of instances) {
      if (ids.has(inst.id)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate ship instance ID: "${inst.id}"`,
          input: instances,
          path: [],
          inst: null as never,
        });
      }
      ids.add(inst.id);
    }
  }),
);

export type ShipInstanceCatalog = z.infer<typeof ShipInstanceCatalogSchema>;

export function validateShipInstances(data: unknown): ShipInstanceCatalog {
  const result = ShipInstanceCatalogSchema.safeParse(data);
  if (result.success) return result.data;
  const messages = result.error.issues.map(
    (issue) => `  [${issue.path.join('.') || '(root)'}] ${issue.message}`,
  );
  throw new Error(`Ship instance validation failed:\n${messages.join('\n')}`);
}
