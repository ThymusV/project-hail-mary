/**
 * Zustand store: world clock.
 *
 * Tracks elapsed in-game hours, independent of render frame rate. Drives
 * transit progress (Fase 1) and will drive the low-frequency faction-AI /
 * economy tick in Fase 3 (see architecture doc, sec. 2.8 — "el mundo avanza
 * en ticks, no cada frame").
 *
 * `timeScale` is in-game hours advanced per real second. UI exposes this
 * as pause/1x/10x/etc. controls — necessary because transit takes tens to
 * hundreds of in-game hours (see engine/orbitalMechanics.ts).
 */

import { create } from 'zustand';

export interface WorldClockState {
  /** Total in-game hours elapsed since new game start. */
  elapsedHours: number;
  /** In-game hours advanced per real second. 0 = paused. */
  timeScale: number;

  // ── Actions ──────────────────────────────────────────────────────
  /** Called every render frame with real delta-seconds; advances elapsedHours by timeScale * deltaSeconds. */
  tick: (deltaSeconds: number) => void;
  setTimeScale: (scale: number) => void;
  pause: () => void;
}

export const DEFAULT_TIME_SCALE = 6; // 6 in-game hours per real second

export const useWorldClockStore = create<WorldClockState>((set, get) => ({
  elapsedHours: 0,
  timeScale: DEFAULT_TIME_SCALE,

  tick: (deltaSeconds) => {
    const { timeScale, elapsedHours } = get();
    if (timeScale <= 0) return;
    set({ elapsedHours: elapsedHours + timeScale * deltaSeconds });
  },

  setTimeScale: (scale) => set({ timeScale: Math.max(0, scale) }),

  pause: () => set({ timeScale: 0 }),
}));
