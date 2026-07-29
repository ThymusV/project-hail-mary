/**
 * Zod schema for factions / organizations (Pre-Protomolecule era).
 *
 * Canon sources: Informe de Facciones Humanas, Informe de Geografía Humana,
 * Informe de Simulación Económica.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// FactionType
// ---------------------------------------------------------------------------

export const FACTION_TYPES = [
  'government', // UN, MCRN
  'megacorp', // Escala sistémica (Mao-Kwikowski, Tycho)
  'corporation', // Escala regional/sectorial (RCE, Krystal Kleer...)
  'belt-faction', // APE y facciones/células del Cinturón
  'info-network', // Entidades de información/propaganda (PNN)
] as const;

export const FactionTypeSchema = z.enum(FACTION_TYPES);
export type FactionType = z.infer<typeof FactionTypeSchema>;

// ---------------------------------------------------------------------------
// Faction
// ---------------------------------------------------------------------------

export const FactionSchema = z.object({
  /** Unique faction identifier, kebab-case */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /**
   * Nombre alternativo, genérico y libre de IP, para usar si el proyecto
   * pasa a distribución pública. Vacío por defecto; se rellena en una
   * pasada dedicada antes de publicar. Ej.: "MCRN" -> "República de Marte
   * Libre (RML)", "Mao-Kwikowski Mercantile" -> nombre propio inventado.
   */
  publicName: z.string().min(1).optional(),
  type: FactionTypeSchema,
  /** Territory / base of operations */
  territory: z.string().min(1),
  /** Political/military/corporate structure summary */
  structure: z.string().min(1),
  /** Key resources or strategic assets */
  keyResources: z.array(z.string().min(1)),
  /** Known tensions or conflicts with other factions */
  tensions: z.array(z.string().min(1)).default([]),
  /** Distinctive culture/identity, if documented */
  culture: z.string().optional(),
  /** Named canon figures associated with this faction */
  notableFigures: z.array(z.string().min(1)).optional(),
  /** Source document(s) */
  source: z.string().min(1),
  /** false = invented for gameplay purposes, not present in canon RPG sources */
  isCanon: z.boolean(),
  notes: z.string().optional(),
});

export type Faction = z.infer<typeof FactionSchema>;

// ---------------------------------------------------------------------------
// FactionCatalog
// ---------------------------------------------------------------------------

export const FactionCatalogSchema = z.array(FactionSchema).check(
  z.superRefine((factions, ctx) => {
    const ids = new Set<string>();
    for (const f of factions) {
      if (ids.has(f.id)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate faction ID: "${f.id}"`,
          input: factions,
          path: [],
          inst: null as never,
        });
      }
      ids.add(f.id);
    }
  }),
);

export type FactionCatalog = z.infer<typeof FactionCatalogSchema>;

export function validateFactions(data: unknown): FactionCatalog {
  const result = FactionCatalogSchema.safeParse(data);
  if (result.success) return result.data;
  const messages = result.error.issues.map(
    (issue) => `  [${issue.path.join('.') || '(root)'}] ${issue.message}`,
  );
  throw new Error(`Faction validation failed:\n${messages.join('\n')}`);
}
