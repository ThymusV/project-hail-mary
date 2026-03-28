/**
 * Zustand store: camera mode state.
 *
 * Three camera modes:
 * - 'follow': auto-follow the cinematic track (default during playback)
 * - 'overview': fixed wide-angle view of the full trajectory
 * - 'free': user-controlled orbit, auto-reverts to follow after idle
 *
 * User interaction during follow/overview temporarily switches to free.
 * After IDLE_TIMEOUT_MS of no interaction, reverts to previous mode.
 */

import { create } from 'zustand';

export type CameraMode = 'follow' | 'overview' | 'free';

/** Seconds of idle before auto-reverting from free to previous mode */
const IDLE_TIMEOUT_S = 3.0;

export interface CameraStore {
  mode: CameraMode;
  /** The mode to revert to after free-mode idle timeout */
  returnMode: CameraMode;
  /** Seconds since last user interaction (reset on input) */
  idleTimer: number;
  /** Whether the user is actively dragging/scrolling */
  isUserInteracting: boolean;

  setMode: (mode: CameraMode) => void;
  notifyUserInteraction: () => void;
  tickIdle: (delta: number) => void;
}

export const useCameraStore = create<CameraStore>((set, get) => ({
  mode: 'follow',
  returnMode: 'follow',
  idleTimer: 0,
  isUserInteracting: false,

  setMode: (mode) => set({ mode, returnMode: mode === 'free' ? get().returnMode : mode, idleTimer: 0 }),

  notifyUserInteraction: () => {
    const { mode } = get();
    if (mode !== 'free') {
      // Switch to free, remember what to return to
      set({ mode: 'free', returnMode: mode, idleTimer: 0, isUserInteracting: true });
    } else {
      set({ idleTimer: 0, isUserInteracting: true });
    }
  },

  tickIdle: (delta) => {
    const { mode, returnMode, idleTimer, isUserInteracting } = get();
    if (mode !== 'free') return;
    if (isUserInteracting) {
      set({ isUserInteracting: false });
      return;
    }
    const next = idleTimer + delta;
    if (next >= IDLE_TIMEOUT_S) {
      // Revert to previous mode
      set({ mode: returnMode, idleTimer: 0 });
    } else {
      set({ idleTimer: next });
    }
  },
}));
