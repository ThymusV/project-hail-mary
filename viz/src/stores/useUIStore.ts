/**
 * Zustand store: UI chrome state (panels, debug, help).
 */

import { create } from 'zustand';

export interface UIState {
  /** Whether the info/detail panel is visible. */
  infoPanelVisible: boolean;
  /** The event currently shown in the info panel (null = nothing selected). */
  selectedEventId: string | null;
  /** Whether the help overlay is visible. */
  helpVisible: boolean;
  /** Whether debug overlays (stats, wireframes, etc.) are active. */
  debugMode: boolean;

  // ── Actions ──────────────────────────────────────────────────────
  showInfoPanel: (eventId: string) => void;
  hideInfoPanel: () => void;
  toggleHelp: () => void;
  toggleDebug: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  infoPanelVisible: false,
  selectedEventId: null,
  helpVisible: false,
  debugMode: false,

  showInfoPanel: (eventId) =>
    set({ infoPanelVisible: true, selectedEventId: eventId }),

  hideInfoPanel: () =>
    set({ infoPanelVisible: false, selectedEventId: null }),

  toggleHelp: () => set((s) => ({ helpVisible: !s.helpVisible })),

  toggleDebug: () => set((s) => ({ debugMode: !s.debugMode })),
}));
