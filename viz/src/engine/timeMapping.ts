/**
 * Non-linear time ↔ progress mapping.
 *
 * Story progress (0 → 1) is divided among segments proportionally to
 * each segment's `progressWeight`.  Within a segment the mapping is
 * linear.  The mapping is pure — no internal state or side-effects.
 */

// ── Input types (inline; will be reconciled with shared schema) ──────

export interface SegmentInput {
  startTime: number;       // chronological time (days)
  endTime: number;         // chronological time (days)
  progressWeight: number;  // relative weight for progress allocation
}

// ── Compiled mapping ─────────────────────────────────────────────────

export interface ProgressMappingEntry {
  /** Segment that owns this range. */
  segment: SegmentInput;
  /** Progress-space start (0-1). */
  progressStart: number;
  /** Progress-space end (0-1). */
  progressEnd: number;
}

export interface ProgressMapping {
  entries: ProgressMappingEntry[];
  /** Earliest chronological time across all segments. */
  minTime: number;
  /** Latest chronological time across all segments. */
  maxTime: number;
}

// ── Build ────────────────────────────────────────────────────────────

/**
 * Build a mapping table from an array of segments.
 *
 * Segments are sorted by `startTime`.  Each segment occupies a
 * proportional slice of the 0-1 progress range based on its weight
 * relative to the sum of all weights.
 */
export function buildProgressMapping(segments: SegmentInput[]): ProgressMapping {
  if (segments.length === 0) {
    return { entries: [], minTime: 0, maxTime: 0 };
  }

  // Sort by chronological start time (non-destructive copy).
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);

  const totalWeight = sorted.reduce((sum, s) => sum + s.progressWeight, 0);
  if (totalWeight === 0) {
    // Degenerate: all weights zero — distribute evenly.
    const equalWeight = 1 / sorted.length;
    let cursor = 0;
    const entries: ProgressMappingEntry[] = sorted.map((seg) => {
      const entry: ProgressMappingEntry = {
        segment: seg,
        progressStart: cursor,
        progressEnd: cursor + equalWeight,
      };
      cursor += equalWeight;
      return entry;
    });
    return {
      entries,
      minTime: sorted[0].startTime,
      maxTime: sorted[sorted.length - 1].endTime,
    };
  }

  let cursor = 0;
  const entries: ProgressMappingEntry[] = sorted.map((seg) => {
    const span = seg.progressWeight / totalWeight;
    const entry: ProgressMappingEntry = {
      segment: seg,
      progressStart: cursor,
      progressEnd: cursor + span,
    };
    cursor += span;
    return entry;
  });

  return {
    entries,
    minTime: sorted[0].startTime,
    maxTime: sorted[sorted.length - 1].endTime,
  };
}

// ── Progress → Time ──────────────────────────────────────────────────

/**
 * Map a story-progress value (0-1) to chronological time (days).
 *
 * - Progress < 0 → clamps to the start of the first segment.
 * - Progress > 1 → clamps to the end of the last segment.
 * - Progress that falls between segment ranges (possible if there are
 *   chronological gaps) is linearly interpolated between the end of
 *   the preceding segment and the start of the next.
 */
export function progressToTime(progress: number, mapping: ProgressMapping): number {
  const { entries } = mapping;
  if (entries.length === 0) return 0;

  // Clamp
  if (progress <= 0) return entries[0].segment.startTime;
  if (progress >= 1) return entries[entries.length - 1].segment.endTime;

  for (const entry of entries) {
    if (progress >= entry.progressStart && progress <= entry.progressEnd) {
      const span = entry.progressEnd - entry.progressStart;
      const localT = span === 0 ? 0 : (progress - entry.progressStart) / span;
      const { startTime, endTime } = entry.segment;
      return startTime + (endTime - startTime) * localT;
    }
  }

  // Should not happen with well-formed data, but handle gracefully.
  return entries[entries.length - 1].segment.endTime;
}

// ── Time → Progress ──────────────────────────────────────────────────

/**
 * Map a chronological time (days) to story-progress (0-1).
 *
 * - Time before the first segment → 0.
 * - Time after the last segment → 1.
 * - Time in a gap between segments → linearly interpolated in
 *   progress-space between the surrounding entries.
 */
export function timeToProgress(time: number, mapping: ProgressMapping): number {
  const { entries } = mapping;
  if (entries.length === 0) return 0;

  // Before first segment
  if (time <= entries[0].segment.startTime) return 0;
  // After last segment
  if (time >= entries[entries.length - 1].segment.endTime) return 1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { startTime, endTime } = entry.segment;

    if (time >= startTime && time <= endTime) {
      // Inside this segment — linear interpolation.
      const duration = endTime - startTime;
      const localT = duration === 0 ? 0 : (time - startTime) / duration;
      return entry.progressStart + (entry.progressEnd - entry.progressStart) * localT;
    }

    // Check if time falls in a gap between this segment and the next.
    if (i < entries.length - 1) {
      const nextEntry = entries[i + 1];
      if (time > endTime && time < nextEntry.segment.startTime) {
        // Linearly interpolate in progress-space across the gap.
        const gapDuration = nextEntry.segment.startTime - endTime;
        const gapT = (time - endTime) / gapDuration;
        return entry.progressEnd + (nextEntry.progressStart - entry.progressEnd) * gapT;
      }
    }
  }

  return 1;
}

// ── Segment resolution ───────────────────────────────────────────────

/**
 * Return the segment whose [startTime, endTime] range contains the
 * given chronological time, or `null` if the time falls in no segment.
 */
export function resolveSegment(
  time: number,
  segments: SegmentInput[],
): SegmentInput | null {
  for (const seg of segments) {
    if (time >= seg.startTime && time <= seg.endTime) {
      return seg;
    }
  }
  return null;
}
