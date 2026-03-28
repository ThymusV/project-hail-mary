/**
 * ChapterNav.tsx — Chapter/scene quick-jump bar.
 *
 * Compact horizontal strip at the top of the viewport. Shows scenes as
 * proportionally-sized segments.  Transparent by default, reveals on hover.
 * Active scene indicated by accent underline with smooth slide animation.
 */

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useTimelineData } from '../../hooks/useTimelineData';

/* ═══════════════════════════════════════════════════════════════════════
 * Chinese scene labels (override for display)
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
 * Styles
 * ═══════════════════════════════════════════════════════════════════════ */

const S = {
  wrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    pointerEvents: 'none',
    padding: '0 24px',
  } satisfies CSSProperties,

  bar: {
    pointerEvents: 'auto',
    height: 48,
    display: 'flex',
    alignItems: 'stretch',
    position: 'relative',
    transition: 'opacity 350ms ease-out',
    userSelect: 'none',
  } satisfies CSSProperties,

  barIdle: {
    opacity: 0.35,
  } satisfies CSSProperties,

  barHover: {
    opacity: 1,
  } satisfies CSSProperties,

  /* ── Glass backdrop that fades in on hover ───────────────────────── */
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(10, 10, 30, 0.5)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '0 0 12px 12px',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.04)',
    borderTop: 'none',
    transition: 'opacity 350ms ease-out',
    pointerEvents: 'none',
  } satisfies CSSProperties,

  backdropHidden: {
    opacity: 0,
  } satisfies CSSProperties,

  backdropVisible: {
    opacity: 1,
  } satisfies CSSProperties,

  /* ── Scene segment ───────────────────────────────────────────────── */
  segment: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 250ms ease-out',
    zIndex: 1,
    overflow: 'hidden',
  } satisfies CSSProperties,

  segmentHover: {
    background: 'rgba(255, 255, 255, 0.04)',
  } satisfies CSSProperties,

  segmentLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: 'rgba(255, 255, 255, 0.4)',
    transition: 'color 250ms ease-out',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    padding: '0 8px',
  } satisfies CSSProperties,

  segmentLabelActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  } satisfies CSSProperties,

  segmentLabelHover: {
    color: 'rgba(255, 255, 255, 0.65)',
  } satisfies CSSProperties,

  /* ── Active underline indicator ──────────────────────────────────── */
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    background: 'linear-gradient(90deg, #4488ff, #66aaff)',
    borderRadius: '2px 2px 0 0',
    transition: 'left 400ms cubic-bezier(0.16, 1, 0.3, 1), width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 2,
    boxShadow: '0 0 8px rgba(68, 136, 255, 0.35)',
  } satisfies CSSProperties,

  /* ── Thin bottom border ──────────────────────────────────────────── */
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    background: 'rgba(255, 255, 255, 0.04)',
    zIndex: 1,
  } satisfies CSSProperties,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

export function ChapterNav() {
  const { storyProgress, setProgress } = useTimelineStore();
  const data = useTimelineData();

  const [isHovering, setIsHovering] = useState(false);
  const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);

  // Unique scene appearances in progress order with merged ranges
  const sceneSegments = useMemo(() => {
    // We need scenes in the order they appear in the narrative,
    // but some scenes appear in multiple non-contiguous segments.
    // Group contiguous appearances together.
    type Block = {
      sceneId: string;
      label: string;
      progressStart: number;
      progressEnd: number;
    };

    const blocks: Block[] = [];
    const { entries } = data.mapping;
    const segmentData = data.segments;

    for (const entry of entries) {
      const seg = segmentData.find(
        (s) =>
          s.startTime === entry.segment.startTime &&
          s.endTime === entry.segment.endTime,
      );
      if (!seg) continue;

      const last = blocks[blocks.length - 1];
      if (last && last.sceneId === seg.sceneId) {
        // Extend existing block
        last.progressEnd = entry.progressEnd;
      } else {
        blocks.push({
          sceneId: seg.sceneId,
          label: SCENE_LABELS_ZH[seg.sceneId] ?? seg.sceneId,
          progressStart: entry.progressStart,
          progressEnd: entry.progressEnd,
        });
      }
    }

    return blocks;
  }, [data]);

  // Which block is active
  const activeIdx = useMemo(() => {
    for (let i = sceneSegments.length - 1; i >= 0; i--) {
      if (storyProgress >= sceneSegments[i].progressStart) return i;
    }
    return 0;
  }, [storyProgress, sceneSegments]);

  // Click handler: jump to start of scene block
  const handleSegmentClick = useCallback(
    (block: (typeof sceneSegments)[number]) => {
      setProgress(block.progressStart + 0.001);
    },
    [setProgress],
  );

  // Compute indicator position as percentages
  const totalProgress = sceneSegments.length > 0
    ? sceneSegments[sceneSegments.length - 1].progressEnd - sceneSegments[0].progressStart
    : 1;

  const indicatorLeft = sceneSegments[activeIdx]
    ? `${((sceneSegments[activeIdx].progressStart - (sceneSegments[0]?.progressStart ?? 0)) / totalProgress) * 100}%`
    : '0%';

  const indicatorWidth = sceneSegments[activeIdx]
    ? `${((sceneSegments[activeIdx].progressEnd - sceneSegments[activeIdx].progressStart) / totalProgress) * 100}%`
    : '0%';

  return (
    <div style={S.wrapper}>
      <div
        style={{
          ...S.bar,
          ...(isHovering ? S.barHover : S.barIdle),
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setHoveredSceneId(null);
        }}
      >
        {/* Glass backdrop */}
        <div
          style={{
            ...S.backdrop,
            ...(isHovering ? S.backdropVisible : S.backdropHidden),
          }}
        />

        {/* Scene segments */}
        {sceneSegments.map((block, i) => {
          const widthPct = ((block.progressEnd - block.progressStart) / totalProgress) * 100;
          const isActive = i === activeIdx;
          const isHovered = hoveredSceneId === `${block.sceneId}-${i}`;
          return (
            <div
              key={`${block.sceneId}-${i}`}
              style={{
                ...S.segment,
                width: `${widthPct}%`,
                ...(isHovered && !isActive ? S.segmentHover : {}),
              }}
              onClick={() => handleSegmentClick(block)}
              onMouseEnter={() => setHoveredSceneId(`${block.sceneId}-${i}`)}
              onMouseLeave={() => setHoveredSceneId(null)}
            >
              <span
                style={{
                  ...S.segmentLabel,
                  ...(isActive ? S.segmentLabelActive : {}),
                  ...(isHovered && !isActive ? S.segmentLabelHover : {}),
                }}
              >
                {block.label}
              </span>
            </div>
          );
        })}

        {/* Sliding indicator */}
        <div
          style={{
            ...S.indicator,
            left: indicatorLeft,
            width: indicatorWidth,
          }}
        />

        {/* Bottom border line */}
        <div style={S.bottomBorder} />
      </div>
    </div>
  );
}

export default ChapterNav;
