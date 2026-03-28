/**
 * Coordinate-frame configuration.
 *
 * Each frame is a completely separate coordinate space — there is no
 * continuous transform between frames.  When switching, the UI performs
 * an animated cut (fade-to-black), not a continuous zoom.
 */

// ── Frame config type ────────────────────────────────────────────────

export interface FrameConfig {
  /** Human-readable description of what 1 scene-unit represents. */
  readonly scale: string;
  /** Camera near-plane distance (scene units). */
  readonly near: number;
  /** Camera far-plane distance (scene units). */
  readonly far: number;
  /** CSS-style hex color for the scene background / clear color. */
  readonly background: string;
}

// ── Static catalogue ─────────────────────────────────────────────────

export const FRAME_CONFIGS = {
  interstellar: {
    scale: '1u = 1 light-year',
    near: 0.01,
    far: 500,
    background: '#030308',
  },
  system: {
    scale: '1u = 0.01 AU',
    near: 0.001,
    far: 100,
    background: '#050510',
  },
  encounter: {
    scale: '1u = 1 meter',
    near: 0.1,
    far: 1000,
    background: '#050510',
  },
  surface: {
    scale: '1u = 1 meter',
    near: 0.1,
    far: 5000,
    background: '#0a0a1a',
  },
} as const satisfies Record<string, FrameConfig>;

export type FrameId = keyof typeof FRAME_CONFIGS;

// ── Lookup ───────────────────────────────────────────────────────────

/**
 * Return the config for a given frame id, or `null` if the id
 * is not recognised.
 */
export function getFrameConfig(frameId: string): FrameConfig | null {
  return (FRAME_CONFIGS as Record<string, FrameConfig>)[frameId] ?? null;
}
