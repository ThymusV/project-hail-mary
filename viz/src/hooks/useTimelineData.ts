/**
 * Hook that loads and indexes timeline.json data for UI components.
 *
 * Returns scenes, segments, events, and helpers for resolving the
 * current state from storyProgress.  Memoised so the JSON is only
 * parsed/indexed once.
 */

import { useMemo } from 'react';
import timelineRaw from '../data/timeline.json';
import {
  buildProgressMapping,
  progressToTime,
  timeToProgress,
  type ProgressMapping,
  type SegmentInput,
} from '../engine/timeMapping';

/* ── Raw types from the JSON ────────────────────────────────────────── */

export interface TimelineEvent {
  id: string;
  chronologicalTime: number;
  narrativeIndex: number;
  chapter: number;
  sceneId: string;
  frameId: string;
  position: [number, number, number];
  label: string;
  description: string;
  importance: number;
  actors: string[];
  tags: string[];
}

export interface TimelineScene {
  id: string;
  frameId: string;
  label: string;
  description: string;
  visibleBodies: string[];
  transitionIn: string;
  transitionDuration: number;
}

export interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
  sceneId: string;
  frameId: string;
  progressWeight: number;
  interpolation: string;
}

/* ── Hook ────────────────────────────────────────────────────────────── */

export interface TimelineData {
  scenes: TimelineScene[];
  segments: TimelineSegment[];
  events: TimelineEvent[];
  mapping: ProgressMapping;

  /** Map storyProgress (0-1) to chronological days. */
  progressToTime: (p: number) => number;
  /** Map chronological days to storyProgress (0-1). */
  timeToProgress: (t: number) => number;
  /** Get event by id. */
  eventById: (id: string) => TimelineEvent | undefined;
  /** Get scene by id. */
  sceneById: (id: string) => TimelineScene | undefined;

  /** Events sorted by their progress position (ascending). */
  eventsByProgress: Array<{ event: TimelineEvent; progress: number }>;

  /**
   * For each scene, the progress range it spans
   * (min progressStart to max progressEnd of its segments).
   */
  sceneRanges: Array<{
    scene: TimelineScene;
    progressStart: number;
    progressEnd: number;
  }>;

  /** Resolve the scene at a given storyProgress. */
  sceneAtProgress: (p: number) => TimelineScene | undefined;
  /** Resolve the event closest to a given storyProgress. */
  nearestEvent: (p: number) => TimelineEvent | undefined;
  /** Get earth year from chronological day. */
  dayToYear: (day: number) => number;
  /** Minumum chronological time across all events (ignoring backstory). */
  minDay: number;
  /** Maximum chronological time. */
  maxDay: number;
}

export function useTimelineData(): TimelineData {
  return useMemo(() => {
    const scenes = timelineRaw.scenes as TimelineScene[];
    const segments = timelineRaw.segments as TimelineSegment[];
    const events = timelineRaw.events as TimelineEvent[];

    // Build progress mapping from segments
    const segmentInputs: SegmentInput[] = segments.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      progressWeight: s.progressWeight,
    }));
    const mapping = buildProgressMapping(segmentInputs);

    // Lookup maps
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const sceneMap = new Map(scenes.map((s) => [s.id, s]));

    // Events by progress position (filter out ancient backstory events
    // whose time is before the first segment)
    const minSegTime = mapping.minTime;
    const maxSegTime = mapping.maxTime;

    const eventsByProgress = events
      .filter((e) => e.chronologicalTime >= minSegTime && e.chronologicalTime <= maxSegTime)
      .map((e) => ({
        event: e,
        progress: timeToProgress(e.chronologicalTime, mapping),
      }))
      .sort((a, b) => a.progress - b.progress);

    // Scene ranges in progress-space
    const sceneProgressMap = new Map<string, { start: number; end: number }>();
    for (const entry of mapping.entries) {
      const seg = segments.find(
        (s) =>
          s.startTime === entry.segment.startTime &&
          s.endTime === entry.segment.endTime,
      );
      if (!seg) continue;
      const existing = sceneProgressMap.get(seg.sceneId);
      if (existing) {
        existing.start = Math.min(existing.start, entry.progressStart);
        existing.end = Math.max(existing.end, entry.progressEnd);
      } else {
        sceneProgressMap.set(seg.sceneId, {
          start: entry.progressStart,
          end: entry.progressEnd,
        });
      }
    }

    // Build sceneRanges preserving the order scenes appear in progress
    const sceneRanges: TimelineData['sceneRanges'] = [];
    const seenScenes = new Set<string>();
    for (const entry of mapping.entries) {
      const seg = segments.find(
        (s) =>
          s.startTime === entry.segment.startTime &&
          s.endTime === entry.segment.endTime,
      );
      if (!seg) continue;
      if (seenScenes.has(seg.sceneId)) continue;
      seenScenes.add(seg.sceneId);
      const range = sceneProgressMap.get(seg.sceneId);
      const scene = sceneMap.get(seg.sceneId);
      if (range && scene) {
        sceneRanges.push({
          scene,
          progressStart: range.start,
          progressEnd: range.end,
        });
      }
    }

    // Resolve scene at progress
    const sceneAtProgress = (p: number): TimelineScene | undefined => {
      const time = progressToTime(p, mapping);
      const seg = segments.find((s) => time >= s.startTime && time <= s.endTime);
      if (seg) return sceneMap.get(seg.sceneId);
      return undefined;
    };

    // Nearest event
    const nearestEvent = (p: number): TimelineEvent | undefined => {
      if (eventsByProgress.length === 0) return undefined;
      let best = eventsByProgress[0];
      let bestDist = Math.abs(best.progress - p);
      for (const ep of eventsByProgress) {
        const d = Math.abs(ep.progress - p);
        if (d < bestDist) {
          bestDist = d;
          best = ep;
        }
      }
      // Only return if reasonably close (within 2% of total)
      return bestDist < 0.02 ? best.event : undefined;
    };

    const dayToYear = (day: number): number => {
      // Day 0 = start of the Petrova discovery (~2028 in-universe)
      return Math.round((2028 + day / 365.25) * 10) / 10;
    };

    return {
      scenes,
      segments,
      events,
      mapping,
      progressToTime: (p: number) => progressToTime(p, mapping),
      timeToProgress: (t: number) => timeToProgress(t, mapping),
      eventById: (id: string) => eventMap.get(id),
      sceneById: (id: string) => sceneMap.get(id),
      eventsByProgress,
      sceneRanges,
      sceneAtProgress,
      nearestEvent,
      dayToYear,
      minDay: minSegTime,
      maxDay: maxSegTime,
    };
  }, []);
}
