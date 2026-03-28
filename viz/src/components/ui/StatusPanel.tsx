/**
 * StatusPanel.tsx — Fixed left-side metrics panel.
 *
 * Displays key mission metrics that update with timeline progress:
 * distance from Earth, mission day, fuel status, characters present,
 * and current chapter/scene.  Glassmorphism design, compact layout,
 * smooth CSS transitions on value changes.
 */

import { useMemo, type CSSProperties } from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useTimelineData } from '../../hooks/useTimelineData';
import { getSharedCurve } from '../../utils/sharedCurve';

/* ═══════════════════════════════════════════════════════════════════════
 * Actor display names (Chinese)
 * ═══════════════════════════════════════════════════════════════════════ */

const ACTOR_NAMES_ZH: Record<string, string> = {
  grace: '格雷斯',
  rocky: '洛基',
  stratt: '斯特拉特',
  petrova: '佩特洛娃',
  marissa: '玛丽莎',
  yao: '姚立杰',
  ilyukhina: '伊柳希娜',
  dubois: '杜波依斯',
  shapiro: '夏皮罗',
  dimitri: '迪米特里',
  xi: '习博士',
  lamai: '拉迈医生',
  lokken: '洛肯博士',
  redell: '瑞德尔',
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene labels (Chinese)
 * ═══════════════════════════════════════════════════════════════════════ */

const SCENE_LABELS_ZH: Record<string, string> = {
  earthDeparture: '地球出发',
  interstellar: '星际航行',
  tauCeti: '鲸鱼座Tau',
  encounter: '第一次接触',
  adrian: '艾德里安采样',
  rescue: '救援行动',
  eridian: '波江座定居',
};

/* ═══════════════════════════════════════════════════════════════════════
 * Fuel computation based on story phase
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Approximate fuel remaining as a fraction (0-1) based on
 * chronological time (mission days).
 *
 * - Launch (day 1460): 100%
 * - Tau Ceti arrival (day 2920): ~10%
 * - After Adrian ops (day 3070): ~5%
 * - Rescue phase (day 3290): ~2%
 * - 40 Eridani (day 5000+): ~0.5%
 * - Pre-launch: N/A (show 100%)
 */
function computeFuelFraction(chronoDay: number): number {
  if (chronoDay <= 1460) return 1.0;
  if (chronoDay <= 1461) return 0.98;
  if (chronoDay <= 2920) {
    // Transit: linear burn from 98% to 10%
    const t = (chronoDay - 1461) / (2920 - 1461);
    return 0.98 - t * 0.88;
  }
  if (chronoDay <= 3070) {
    // Tau Ceti ops: 10% -> 5%
    const t = (chronoDay - 2920) / (3070 - 2920);
    return 0.10 - t * 0.05;
  }
  if (chronoDay <= 3290) {
    // Adrian & separation: 5% -> 2%
    const t = (chronoDay - 3070) / (3290 - 3070);
    return 0.05 - t * 0.03;
  }
  if (chronoDay <= 5000) {
    // Rescue + journey to Eridani: 2% -> 0.5%
    const t = (chronoDay - 3290) / (5000 - 3290);
    return 0.02 - t * 0.015;
  }
  // Eridian settlement: 0.5%
  return 0.005;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Distance computation from shared trajectory curve
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Compute approximate distance from Earth (Sol) in light-years
 * using the shared trajectory CatmullRomCurve3.
 *
 * The curve goes from Sol (0,0,0) through transit to Tau Ceti (11.9 ly)
 * and on to 40 Eridani.  We map storyProgress to curve-t roughly:
 * - progress 0 -> curve-t 0 (Sol)
 * - progress ~0.3 -> curve-t ~0.5 (Tau Ceti)
 * - progress 1 -> curve-t 1 (40 Eridani)
 */
function computeDistanceLy(storyProgress: number): number {
  const curve = getSharedCurve();
  // Map progress to curve parameter
  const curveT = Math.max(0, Math.min(1, storyProgress));
  const point = curve.getPointAt(curveT);
  // Distance from origin (Sol at 0,0,0) — the curve is in light-year units
  return point.length();
}

/* ═══════════════════════════════════════════════════════════════════════
 * Styles
 * ═══════════════════════════════════════════════════════════════════════ */

const S = {
  panel: {
    position: 'fixed',
    left: 24,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 220,
    zIndex: 80,
    background: 'rgba(10, 10, 30, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    pointerEvents: 'auto',
    userSelect: 'none',
  } satisfies CSSProperties,

  section: {
    padding: '10px 0',
  } satisfies CSSProperties,

  sectionFirst: {
    paddingTop: 0,
  } satisfies CSSProperties,

  sectionLast: {
    paddingBottom: 0,
  } satisfies CSSProperties,

  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    margin: 0,
    border: 'none',
  } satisfies CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.03em',
    color: 'rgba(255, 255, 255, 0.38)',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    lineHeight: 1.2,
  } satisfies CSSProperties,

  value: {
    fontSize: 15,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 1.3,
    transition: 'opacity 250ms ease-out',
    fontVariantNumeric: 'tabular-nums',
  } satisfies CSSProperties,

  valueSm: {
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 1.4,
    transition: 'opacity 250ms ease-out',
  } satisfies CSSProperties,

  /* ── Fuel bar ───────────────────────────────────────────────────── */
  fuelBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    background: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    overflow: 'hidden',
  } satisfies CSSProperties,

  fuelBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 400ms ease-out, background 400ms ease-out',
  } satisfies CSSProperties,

  /* ── Character pills ────────────────────────────────────────────── */
  actorsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  } satisfies CSSProperties,

  actorPill: {
    fontSize: 11,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.65)',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 999,
    padding: '2px 8px',
    lineHeight: 1.3,
  } satisfies CSSProperties,

  /* ── Scene sub-label ────────────────────────────────────────────── */
  sceneLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    transition: 'opacity 250ms ease-out',
  } satisfies CSSProperties,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

export function StatusPanel() {
  const storyProgress = useTimelineStore((s) => s.storyProgress);
  const data = useTimelineData();

  const chronoTime = data.progressToTime(storyProgress);
  const currentScene = data.sceneAtProgress(storyProgress);
  const nearestEvt = data.nearestEvent(storyProgress);

  /* ── Computed metrics ───────────────────────────────────────────── */
  const distanceLy = useMemo(
    () => computeDistanceLy(storyProgress),
    [storyProgress],
  );

  const fuelFraction = useMemo(
    () => computeFuelFraction(chronoTime),
    [chronoTime],
  );

  const missionDay = chronoTime > 2920
    ? Math.round(chronoTime - 2920)
    : null;

  const fuelPct = Math.round(fuelFraction * 100);

  // Fuel bar color: green -> yellow -> orange -> red
  const fuelColor =
    fuelFraction > 0.5
      ? '#44cc88'
      : fuelFraction > 0.2
        ? '#ccaa44'
        : fuelFraction > 0.05
          ? '#cc7744'
          : '#cc4444';

  // Actors from nearest event
  const actors = nearestEvt?.actors ?? [];

  // Chapter from nearest event
  const chapter = nearestEvt?.chapter ?? null;

  // Scene label in Chinese
  const sceneId = currentScene?.id ?? '';
  const sceneLabelZh = SCENE_LABELS_ZH[sceneId] ?? currentScene?.label ?? '';

  return (
    <div style={S.panel}>
      {/* Distance */}
      <div style={{ ...S.section, ...S.sectionFirst }}>
        <div style={S.label}>
          <span>&#x1F4CD;</span>
          <span>Distance from Earth</span>
        </div>
        <div style={S.value}>
          {distanceLy.toFixed(1)} ly
        </div>
      </div>

      <hr style={S.divider} />

      {/* Mission Day */}
      <div style={S.section}>
        <div style={S.label}>
          <span>&#x23F1;</span>
          <span>Mission Day</span>
        </div>
        <div style={S.value}>
          {missionDay !== null ? `Day ${missionDay}` : 'Pre-launch'}
        </div>
      </div>

      <hr style={S.divider} />

      {/* Fuel Status */}
      <div style={S.section}>
        <div style={S.label}>
          <span>&#x1F680;</span>
          <span>Fuel Status</span>
        </div>
        <div style={S.value}>{fuelPct}%</div>
        <div style={S.fuelBarBg}>
          <div
            style={{
              ...S.fuelBarFill,
              width: `${Math.max(1, fuelFraction * 100)}%`,
              background: fuelColor,
              boxShadow: `0 0 6px ${fuelColor}44`,
            }}
          />
        </div>
      </div>

      <hr style={S.divider} />

      {/* Characters Present */}
      <div style={S.section}>
        <div style={S.label}>
          <span>&#x1F465;</span>
          <span>Characters Present</span>
        </div>
        {actors.length > 0 ? (
          <div style={S.actorsWrap}>
            {actors.map((a) => (
              <span key={a} style={S.actorPill}>
                {ACTOR_NAMES_ZH[a] ?? a}
              </span>
            ))}
          </div>
        ) : (
          <div style={S.valueSm}>--</div>
        )}
      </div>

      <hr style={S.divider} />

      {/* Chapter & Scene */}
      <div style={{ ...S.section, ...S.sectionLast }}>
        <div style={S.label}>
          <span>&#x1F4D6;</span>
          <span>Chapter</span>
        </div>
        <div style={S.value}>
          {chapter !== null ? `${chapter}` : '--'}
        </div>
        {sceneLabelZh && (
          <div style={S.sceneLabel}>{sceneLabelZh}</div>
        )}
      </div>
    </div>
  );
}

export default StatusPanel;
