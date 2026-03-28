/**
 * Zustand store: timeline / playback state.
 *
 * `storyProgress` (0-1) is the master control.  All other temporal
 * values are derived from it via the time-mapping engine.
 */

import { create } from 'zustand';

export interface TimelineState {
  // ── Core state ───────────────────────────────────────────────────
  /** Master position in the story (0-1). */
  storyProgress: number;
  /** Chronological time in days, derived from storyProgress. */
  chronologicalTime: number;
  /** Whether automatic playback is running. */
  isPlaying: boolean;
  /** Playback speed multiplier (e.g. 1, 10, 100). */
  playbackSpeed: number;
  /** Which timeline axis the scrubber represents. */
  timelineMode: 'chronological' | 'narrative';

  // ── Derived / cached identifiers ─────────────────────────────────
  activeSceneId: string | null;
  activeSegmentId: string | null;
  /** Events at or near the current chronological time. */
  activeEventIds: string[];

  // ── Camera recenter ─────────────────────────────────────────────
  /** Monotonically incrementing id; CameraRig watches for changes. */
  recenterRequestId: number;

  // ── Actions ──────────────────────────────────────────────────────
  setProgress: (p: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  seekToEvent: (eventId: string) => void;
  setTimelineMode: (mode: 'chronological' | 'narrative') => void;
  setChronologicalTime: (time: number) => void;
  setActiveSceneId: (id: string | null) => void;
  setActiveSegmentId: (id: string | null) => void;
  setActiveEventIds: (ids: string[]) => void;

  /** Step to next event (by progress). Requires eventsByProgress from data layer. */
  stepToNextEvent: (eventsByProgress: Array<{ progress: number }>) => void;
  /** Step to previous event (by progress). */
  stepToPrevEvent: (eventsByProgress: Array<{ progress: number }>) => void;
  /** Request a camera recenter (resets orbit back to cinematic track). */
  requestRecenter: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  // ── Defaults ─────────────────────────────────────────────────────
  storyProgress: 0,
  chronologicalTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  timelineMode: 'narrative',

  activeSceneId: null,
  activeSegmentId: null,
  activeEventIds: [],
  recenterRequestId: 0,

  // ── Actions ──────────────────────────────────────────────────────

  setProgress: (p) =>
    set({ storyProgress: Math.max(0, Math.min(1, p)) }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setSpeed: (speed) => set({ playbackSpeed: speed }),

  seekToEvent: (_eventId) => {
    // Seeking requires resolving the event's chronological time through
    // the data layer and then mapping to progress.  The actual lookup
    // is performed by the orchestration layer — here we simply expose
    // the intent.  The orchestrator will call `setProgress` once the
    // target progress value is known.
    //
    // For now this is a no-op placeholder that downstream code will
    // wire up once the data layer is available.
    void _eventId;
  },

  setTimelineMode: (mode) => set({ timelineMode: mode }),

  setChronologicalTime: (time) => set({ chronologicalTime: time }),

  setActiveSceneId: (id) => set({ activeSceneId: id }),

  setActiveSegmentId: (id) => set({ activeSegmentId: id }),

  setActiveEventIds: (ids) => set({ activeEventIds: ids }),

  stepToNextEvent: (eventsByProgress) =>
    set((s) => {
      const next = eventsByProgress.find((ep) => ep.progress > s.storyProgress + 0.001);
      if (!next) return s;
      return { storyProgress: Math.max(0, Math.min(1, next.progress)), isPlaying: false };
    }),

  stepToPrevEvent: (eventsByProgress) =>
    set((s) => {
      // Walk backwards to find the first event before current position
      let prev: { progress: number } | undefined;
      for (let i = eventsByProgress.length - 1; i >= 0; i--) {
        if (eventsByProgress[i].progress < s.storyProgress - 0.001) {
          prev = eventsByProgress[i];
          break;
        }
      }
      if (!prev) return s;
      return { storyProgress: Math.max(0, Math.min(1, prev.progress)), isPlaying: false };
    }),

  requestRecenter: () =>
    set((s) => ({ recenterRequestId: s.recenterRequestId + 1 })),
}));
