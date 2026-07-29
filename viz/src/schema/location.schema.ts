/**
 * Zod schema for locations: celestial bodies, stations, settlements, outposts.
 *
 * Canon sources: Informe de Geografía Humana y Catálogo de Localizaciones,
 * Informe de Simulación Económica, Informe de Facciones Humanas.
 *
 * IMPORTANT re: IP — "Estación Tycho" was deliberately NOT included here;
 * it is replaced by the invented "estacion-forja" (see locations.json).
 * Real astronomical bodies (Earth, Mars, Europa, Io, Titan, Ceres...) carry
 * no IP risk — only invented proper nouns for stations/settlements do.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// LocationType
// ---------------------------------------------------------------------------

export const LOCATION_TYPES = [
  'planet',
  'dwarf-planet',
  'moon',
  'station', // Estructura artificial independiente (no un asentamiento planetario)
  'settlement', // Asentamiento sobre un cuerpo celeste (ciudad, colonia)
  'outpost', // Puesto pequeño/informal, a menudo semi-abandonado
  'asteroid-field', // Zona de campo de asteroides sin cuerpo único dominante
] as const;

export const LocationTypeSchema = z.enum(LOCATION_TYPES);
export type LocationType = z.infer<typeof LocationTypeSchema>;

// ---------------------------------------------------------------------------
// LocationRegion — mirrors the report's "Región I/II/III + Fronteras Lejanas"
// ---------------------------------------------------------------------------

export const LOCATION_REGIONS = ['inner', 'belt', 'outer', 'frontier'] as const;

export const LocationRegionSchema = z.enum(LOCATION_REGIONS);
export type LocationRegion = z.infer<typeof LocationRegionSchema>;

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export const LocationSchema = z.object({
  /** Unique location identifier, kebab-case */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /**
   * Nombre alternativo libre de IP para distribución pública. Los cuerpos
   * celestes reales (Marte, Europa, Ceres...) no lo necesitan; las
   * estaciones/asentamientos con nombre inventado del canon RPG sí, cuando
   * llegue la pasada de rebranding (Fase 5).
   */
  publicName: z.string().min(1).optional(),
  type: LocationTypeSchema,
  region: LocationRegionSchema,
  /** id of the celestial body this orbits/sits on, or null if not applicable (e.g. a planet) */
  parentBody: z.string().min(1).nullable(),
  /** Must match a Faction.id from factions.json, or null if uncontrolled/contested/unaffiliated */
  factionId: z.string().min(1).nullable(),
  economicStrategicRole: z.string().min(1),
  /** Free-text design/architecture details ("Detalles de Diseño") */
  designDetails: z.string().optional(),
  source: z.string().min(1),
  /** false = invented for gameplay purposes, not present in canon RPG sources */
  isCanon: z.boolean(),
  notes: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

// ---------------------------------------------------------------------------
// LocationCatalog
// ---------------------------------------------------------------------------

export const LocationCatalogSchema = z.array(LocationSchema).check(
  z.superRefine((locations, ctx) => {
    const ids = new Set<string>();
    for (const l of locations) {
      if (ids.has(l.id)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate location ID: "${l.id}"`,
          input: locations,
          path: [],
          inst: null as never,
        });
      }
      ids.add(l.id);
    }
    // parentBody is self-referential within this same catalog
    for (const l of locations) {
      if (l.parentBody !== null && !ids.has(l.parentBody)) {
        ctx.issues.push({
          code: 'custom',
          message: `Location "${l.id}" references unknown parentBody "${l.parentBody}"`,
          input: locations,
          path: [],
          inst: null as never,
        });
      }
    }
  }),
);

export type LocationCatalog = z.infer<typeof LocationCatalogSchema>;

export function validateLocations(data: unknown): LocationCatalog {
  const result = LocationCatalogSchema.safeParse(data);
  if (result.success) return result.data;
  const messages = result.error.issues.map(
    (issue) => `  [${issue.path.join('.') || '(root)'}] ${issue.message}`,
  );
  throw new Error(`Location validation failed:\n${messages.join('\n')}`);
}
