/**
 * Zod schema for naval/space weapon systems (Pre-Protomolecule era).
 *
 * Mirrors the pattern of timeline.schema.ts from the base repo:
 * this is the single source of truth for both runtime validation and
 * compile-time TypeScript types.
 *
 * Canon source: Catálogo Técnico de Armamento Naval y Sistemas de Combate
 * (Pre-Protomolécula), sección 2-3.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// WeaponCategory
// ---------------------------------------------------------------------------

export const WEAPON_CATEGORIES = [
  'pdc', // Point Defense Cannon / Red de Defensa de Punto
  'railgun', // Cañón eléctrico / coilgun
  'torpedo', // Torpedo guiado
  'mine', // Mina espacial
  'grappler', // Gancho de abordaje
] as const;

export const WeaponCategorySchema = z.enum(WEAPON_CATEGORIES);
export type WeaponCategory = z.infer<typeof WeaponCategorySchema>;

// ---------------------------------------------------------------------------
// WeaponRange
// ---------------------------------------------------------------------------

export const WEAPON_RANGES = ['close', 'medium', 'long'] as const;

export const WeaponRangeSchema = z.enum(WEAPON_RANGES);
export type WeaponRange = z.infer<typeof WeaponRangeSchema>;

// ---------------------------------------------------------------------------
// Weapon
// ---------------------------------------------------------------------------

export const WeaponSchema = z.object({
  /** Unique weapon identifier, kebab-case */
  id: z.string().min(1),
  /** Canonical/display name */
  name: z.string().min(1),
  /**
   * Nombre alternativo libre de IP para distribución pública. La mayoría de
   * armas ya usan términos genéricos de ciencia ficción dura (PDC, railgun,
   * torpedo) y no suelen requerir cambio — se incluye por consistencia con
   * ship.schema.ts / faction.schema.ts, no porque el riesgo sea alto aquí.
   */
  publicName: z.string().min(1).optional(),
  /** Original-language name if different from `name` (e.g. French RPG source) */
  originalName: z.string().optional(),
  /** Weapon category */
  category: WeaponCategorySchema,
  /** Engagement range band */
  range: WeaponRangeSchema,
  /** Damage in dice notation, e.g. "2d6", "1d6+4". Omit for non-damage utility weapons (e.g. grapplers). */
  damage: z
    .string()
    .regex(/^\d+d\d+(\+\d+)?$/, 'Must be dice notation, e.g. "2d6" or "1d6+4"')
    .optional(),
  /** Free-text tactical role / usage notes */
  tacticalNotes: z.string().optional(),
  /** Countermeasures known to be effective against this weapon */
  counterMeasures: z.string().optional(),
  /** Source document this entry was extracted from */
  source: z.string().min(1),
  /** false = invented for gameplay purposes, not present in canon RPG sources */
  isCanon: z.boolean(),
  /** Free-text notes, e.g. design rationale for non-canon entries */
  notes: z.string().optional(),
});

export type Weapon = z.infer<typeof WeaponSchema>;

// ---------------------------------------------------------------------------
// WeaponCatalog
// ---------------------------------------------------------------------------

export const WeaponCatalogSchema = z.array(WeaponSchema).check(
  z.superRefine((weapons, ctx) => {
    const ids = new Set<string>();
    for (const w of weapons) {
      if (ids.has(w.id)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate weapon ID: "${w.id}"`,
          input: weapons,
          path: [],
          inst: null as never,
        });
      }
      ids.add(w.id);
    }
  }),
);

export type WeaponCatalog = z.infer<typeof WeaponCatalogSchema>;

export function validateWeapons(data: unknown): WeaponCatalog {
  const result = WeaponCatalogSchema.safeParse(data);
  if (result.success) return result.data;
  const messages = result.error.issues.map(
    (issue) => `  [${issue.path.join('.') || '(root)'}] ${issue.message}`,
  );
  throw new Error(`Weapon validation failed:\n${messages.join('\n')}`);
}
