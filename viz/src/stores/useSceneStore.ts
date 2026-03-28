/**
 * Zustand store: scene / coordinate-frame transitions.
 *
 * Tracks the active scene and exposes a simple transition lifecycle
 * (start → progress → end) that the renderer consumes for the
 * fade-to-black cut between coordinate frames.
 */

import { create } from 'zustand';

export interface SceneState {
  /** Currently active scene identifier (matches data model). */
  activeSceneId: string | null;
  /** True while a scene transition animation is in progress. */
  isTransitioning: boolean;
  /** 0-1 progress of the fade animation. */
  transitionProgress: number;

  // ── Actions ──────────────────────────────────────────────────────
  setScene: (sceneId: string) => void;
  startTransition: () => void;
  /** Update fade progress (0-1) during animation tick. */
  setTransitionProgress: (p: number) => void;
  endTransition: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  activeSceneId: null,
  isTransitioning: false,
  transitionProgress: 0,

  setScene: (sceneId) => set({ activeSceneId: sceneId }),

  startTransition: () =>
    set({ isTransitioning: true, transitionProgress: 0 }),

  setTransitionProgress: (p) =>
    set({ transitionProgress: Math.max(0, Math.min(1, p)) }),

  endTransition: () =>
    set({ isTransitioning: false, transitionProgress: 0 }),
}));
