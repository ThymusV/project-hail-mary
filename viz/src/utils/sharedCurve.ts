/**
 * Shared trajectory spline for interstellar flight path.
 *
 * Four named segments model the actual story path:
 *   1. Sol -> Tau Ceti (outbound journey)
 *   2. Tau Ceti -> partial return toward Sol (Grace starts heading home)
 *   3. Turnaround -> rescue Rocky (Grace turns back)
 *   4. Reunion -> 40 Eridani (journey to Rocky's home)
 *
 * Each segment is a CatmullRomCurve3.  A composite helper joins them
 * end-to-end so Spacecraft can sample a single 0-1 progress.
 */

import * as THREE from 'three';

// ── Segment definitions ────────────────────────────────────────────────

export interface TrajectorySegment {
  name: string;
  color: string;
  waypoints: THREE.Vector3[];
}

const SOL = new THREE.Vector3(0, 0, 0);
const TAU_CETI = new THREE.Vector3(11.9, 0, 0);
const PARTIAL_RETURN = new THREE.Vector3(8.0, 1.5, 0.5);
const RESCUE_POINT = new THREE.Vector3(9.5, 0.8, 0.3);
const ERIDANI_40 = new THREE.Vector3(-8, 12, 3);

export const TRAJECTORY_SEGMENTS: TrajectorySegment[] = [
  {
    name: 'Outbound',
    color: '#4488ff',
    waypoints: [
      SOL.clone(),
      new THREE.Vector3(5.0, 0.3, 0.1),   // mid-transit control
      TAU_CETI.clone(),
    ],
  },
  {
    name: 'PartialReturn',
    color: '#44ddff',
    waypoints: [
      TAU_CETI.clone(),
      new THREE.Vector3(10.0, 0.9, 0.35),  // slight arc
      PARTIAL_RETURN.clone(),
    ],
  },
  {
    name: 'Rescue',
    color: '#ff6644',
    waypoints: [
      PARTIAL_RETURN.clone(),
      new THREE.Vector3(8.6, 1.1, 0.4),    // tight arc
      RESCUE_POINT.clone(),
    ],
  },
  {
    name: 'ToEridani',
    color: '#ffaa33',
    waypoints: [
      RESCUE_POINT.clone(),
      new THREE.Vector3(4.0, 6.0, 1.5),    // wide arc toward 40 Eridani
      ERIDANI_40.clone(),
    ],
  },
];

const SEGMENT_COLORS = TRAJECTORY_SEGMENTS.map((s) => s.color);

// ── Per-segment curves (lazy singletons) ───────────────────────────────

let _segmentCurves: THREE.CatmullRomCurve3[] | null = null;

export function getSegmentCurves(): THREE.CatmullRomCurve3[] {
  if (!_segmentCurves) {
    _segmentCurves = TRAJECTORY_SEGMENTS.map(
      (seg) => new THREE.CatmullRomCurve3(seg.waypoints, false, 'centripetal', 0.5),
    );
  }
  return _segmentCurves;
}

// ── Composite curve helpers ────────────────────────────────────────────

/**
 * Cumulative arc-lengths for each segment, normalised to 0-1 total.
 * Used to map a global 0-1 progress to [segmentIndex, localT].
 */
let _segmentRanges: { start: number; end: number; length: number }[] | null = null;

function getSegmentRanges() {
  if (_segmentRanges) return _segmentRanges;

  const curves = getSegmentCurves();
  const lengths = curves.map((c) => c.getLength());
  const total = lengths.reduce((a, b) => a + b, 0);

  _segmentRanges = [];
  let cumulative = 0;
  for (const len of lengths) {
    const norm = len / total;
    _segmentRanges.push({ start: cumulative, end: cumulative + norm, length: norm });
    cumulative += norm;
  }
  return _segmentRanges;
}

/**
 * Given a global 0-1 progress, return the segment index and the
 * local 0-1 t within that segment.
 */
export function getSegmentAtProgress(t: number): { segmentIndex: number; localT: number } {
  const ranges = getSegmentRanges();
  const clamped = Math.max(0, Math.min(1, t));

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (clamped <= r.end || i === ranges.length - 1) {
      const localT = r.length === 0 ? 0 : Math.max(0, Math.min(1, (clamped - r.start) / r.length));
      return { segmentIndex: i, localT };
    }
  }
  return { segmentIndex: ranges.length - 1, localT: 1 };
}

/** Return the hex color string for a segment index. */
export function getSegmentColor(segmentIndex: number): string {
  return SEGMENT_COLORS[Math.max(0, Math.min(segmentIndex, SEGMENT_COLORS.length - 1))];
}

// ── Legacy getSharedCurve — now samples the composite ──────────────────

/**
 * Return a single CatmullRom approximating the full composite path.
 * Used by Spacecraft for smooth position/tangent lookups.
 */
let _sharedCurve: THREE.CatmullRomCurve3 | null = null;
const COMPOSITE_SAMPLES = 200;

export function getSharedCurve(): THREE.CatmullRomCurve3 {
  if (!_sharedCurve) {
    const curves = getSegmentCurves();
    getSegmentRanges(); // ensure ranges are computed
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= COMPOSITE_SAMPLES; i++) {
      const globalT = i / COMPOSITE_SAMPLES;
      const { segmentIndex, localT } = getSegmentAtProgress(globalT);
      const pt = curves[segmentIndex].getPointAt(Math.max(0, Math.min(1, localT)));
      points.push(pt);
    }

    _sharedCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  }
  return _sharedCurve;
}
