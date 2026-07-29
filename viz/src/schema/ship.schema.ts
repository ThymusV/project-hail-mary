/**
 * Zod schema for ship classes / named vessels (Pre-Protomolecule era).
 *
 * Canon sources: Catálogo Técnico de Naves Espaciales (Pre-Protomolécula),
 * Análisis de Cobertura Documental.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// ShipCategory — size tier
// ---------------------------------------------------------------------------

export const SHIP_CATEGORIES = ['small', 'medium', 'large', 'capital'] as const;

export const ShipCategorySchema = z.enum(SHIP_CATEGORIES);
export type ShipCategory = z.infer<typeof ShipCategorySchema>;

// ---------------------------------------------------------------------------
// ShipKind — class (blueprint) vs. specific named vessel from canon
// ---------------------------------------------------------------------------

export const SHIP_KINDS = ['class', 'namedVessel'] as const;

export const ShipKindSchema = z.enum(SHIP_KINDS);
export type ShipKind = z.infer<typeof ShipKindSchema>;

// ---------------------------------------------------------------------------
// OperatorType — who typically operates this ship, independent of factionId
// ---------------------------------------------------------------------------

export const OPERATOR_TYPES = ['military', 'corporate', 'civilian', 'pirate', 'mercenary'] as const;

export const OperatorTypeSchema = z.enum(OPERATOR_TYPES);
export type OperatorType = z.infer<typeof OperatorTypeSchema>;

// ---------------------------------------------------------------------------
// ShipWeaponMount — a weapon reference + how many are mounted
// ---------------------------------------------------------------------------

export const ShipWeaponMountSchema = z.object({
  /** Must match a Weapon.id from weapons.json */
  weaponId: z.string().min(1),
  quantity: z.number().int().positive(),
  /** e.g. "Red de 6 cañones con cobertura total" */
  mountNotes: z.string().optional(),
});

export type ShipWeaponMount = z.infer<typeof ShipWeaponMountSchema>;

// ---------------------------------------------------------------------------
// Ship
// ---------------------------------------------------------------------------

export const ShipSchema = z.object({
  /** Unique ship identifier, kebab-case */
  id: z.string().min(1),
  /** Display name, e.g. "Clase Donnager", "Anne Bonny" */
  name: z.string().min(1),
  /**
   * Nombre alternativo, genérico y libre de IP, para usar si el proyecto
   * pasa a distribución pública (ver resolución de dudas de propiedad
   * intelectual). Vacío por defecto; se rellena en una pasada dedicada
   * antes de publicar, no ahora. Ej.: "Diadème" -> "Solenne".
   */
  publicName: z.string().min(1).optional(),
  kind: ShipKindSchema,
  category: ShipCategorySchema,
  /** Must match a Faction.id from factions.json, or null if unaffiliated */
  factionId: z.string().min(1).nullable(),
  operatorType: OperatorTypeSchema,
  /** Tactical/functional role */
  role: z.string().min(1),
  lengthMeters: z.number().positive().optional(),
  crew: z
    .object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
    })
    .optional(),
  /** Hull rating in dice notation, e.g. "2d6" */
  hull: z.string().regex(/^\d+d\d+$/, 'Must be dice notation, e.g. "2d6"').optional(),
  /** Sensor rating (0-4+ per canon Advanced Sensor Package scale) */
  sensorsRating: z.number().int().nonnegative().optional(),
  propulsion: z.string().optional(),
  weapons: z.array(ShipWeaponMountSchema).default([]),
  /** Positive traits, e.g. "Durable", "Disguise", "Advanced Sensor Package" */
  qualities: z.array(z.string().min(1)).default([]),
  /** Negative traits, e.g. "Maintenance dispendieuse", "Fragile" */
  flaws: z.array(z.string().min(1)).default([]),
  /** Free-text distinguishing feature ("particularidad") */
  specialFeature: z.string().optional(),
  cargoOrBayCapacity: z.string().optional(),
  source: z.string().min(1),
  /** false = invented for gameplay purposes, not present in canon RPG sources */
  isCanon: z.boolean(),
  /**
   * false = canon source names this ship but does not provide full combat
   * stats (hull/sensors/weapons). Flags a documentation gap per the
   * Análisis de Cobertura Documental — fill in via Fase 0-1 playtesting,
   * not by inventing precision that isn't there.
   */
  statsComplete: z.boolean(),
  notes: z.string().optional(),
});

export type Ship = z.infer<typeof ShipSchema>;

// ---------------------------------------------------------------------------
// ShipCatalog
// ---------------------------------------------------------------------------

export const ShipCatalogSchema = z.array(ShipSchema).check(
  z.superRefine((ships, ctx) => {
    const ids = new Set<string>();
    for (const s of ships) {
      if (ids.has(s.id)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate ship ID: "${s.id}"`,
          input: ships,
          path: [],
          inst: null as never,
        });
      }
      ids.add(s.id);
    }
  }),
);

export type ShipCatalog = z.infer<typeof ShipCatalogSchema>;

export function validateShips(data: unknown): ShipCatalog {
  const result = ShipCatalogSchema.safeParse(data);
  if (result.success) return result.data;
  const messages = result.error.issues.map(
    (issue) => `  [${issue.path.join('.') || '(root)'}] ${issue.message}`,
  );
  throw new Error(`Ship validation failed:\n${messages.join('\n')}`);
}
