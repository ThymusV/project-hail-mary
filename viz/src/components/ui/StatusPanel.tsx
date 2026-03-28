/**
 * StatusPanel.tsx -- Comprehensive left-side panel with three sections:
 *
 * A) Entity Tracker: key stars, ships, and characters with status dots
 * B) Event Synopsis: current/nearest event card (replaces removed 3D card)
 * C) Event Log: scrollable reverse-chronological log of passed events
 *
 * Glassmorphism design, smooth CSS transitions, all Chinese labels.
 */

import { useMemo, useRef, useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useTimelineData, type TimelineEvent } from '../../hooks/useTimelineData';

/* ═══════════════════════════════════════════════════════════════════════
 * Entity status derivation
 * ═══════════════════════════════════════════════════════════════════════ */

type DotColor = 'green' | 'yellow' | 'gray' | 'red';

interface EntityStatus {
  name: string;
  status: string;
  dot: DotColor;
}

function getStarStatuses(chronoTime: number): EntityStatus[] {
  // Sol / 太阳
  let solStatus: string;
  let solDot: DotColor;
  if (chronoTime < 0) {
    solStatus = '正常';
    solDot = 'green';
  } else if (chronoTime < 200) {
    solStatus = '感染中';
    solDot = 'yellow';
  } else if (chronoTime < 1460) {
    solStatus = '持续变暗';
    solDot = 'red';
  } else if (chronoTime < 3295) {
    solStatus = '变暗中 · 等待救援';
    solDot = 'red';
  } else if (chronoTime < 8800) {
    solStatus = '恢复中';
    solDot = 'yellow';
  } else {
    solStatus = '已恢复';
    solDot = 'green';
  }

  // Tau Ceti / 鲸鱼座τ
  const tauStatus = chronoTime >= 2920 ? '免疫 · 存在Tau星虫' : '免疫';
  const tauDot: DotColor = 'green';

  // 40 Eridani / 波江座40
  let eriStatus: string;
  let eriDot: DotColor;
  if (chronoTime < 200) {
    eriStatus = '感染中';
    eriDot = 'red';
  } else if (chronoTime < 3470) {
    eriStatus = '感染 · 等待Tau星虫';
    eriDot = 'red';
  } else {
    eriStatus = '接收Tau星虫';
    eriDot = 'yellow';
  }

  return [
    { name: '太阳', status: solStatus, dot: solDot },
    { name: '鲸鱼座τ', status: tauStatus, dot: tauDot },
    { name: '波江座40', status: eriStatus, dot: eriDot },
  ];
}

function getShipStatuses(chronoTime: number): EntityStatus[] {
  // Hail Mary / 万福玛利亚号
  let hmStatus: string;
  let hmDot: DotColor;
  if (chronoTime < 1000) {
    hmStatus = '建造中';
    hmDot = 'yellow';
  } else if (chronoTime < 1460) {
    hmStatus = '组装完成 · 待发射';
    hmDot = 'yellow';
  } else if (chronoTime < 2920) {
    hmStatus = '星际航行 · 船员休眠';
    hmDot = 'green';
  } else if (chronoTime < 3170) {
    hmStatus = '鲸鱼座τ · 研究中';
    hmDot = 'green';
  } else if (chronoTime < 3290) {
    hmStatus = '返航中';
    hmDot = 'yellow';
  } else if (chronoTime < 3470) {
    hmStatus = '搜救行动中';
    hmDot = 'red';
  } else if (chronoTime < 5000) {
    hmStatus = '前往波江座40';
    hmDot = 'green';
  } else {
    hmStatus = '波江b轨道';
    hmDot = 'gray';
  }

  // Target A / 目标A (Rocky's ship)
  let taStatus: string;
  let taDot: DotColor;
  if (chronoTime < 2932) {
    taStatus = '未知';
    taDot = 'gray';
  } else if (chronoTime < 3170) {
    taStatus = '已会合 · 合作中';
    taDot = 'green';
  } else if (chronoTime < 3230) {
    taStatus = '已分离 · 航行中';
    taDot = 'yellow';
  } else if (chronoTime < 3386) {
    taStatus = '失去动力 · 危险';
    taDot = 'red';
  } else {
    taStatus = '已救援 · 安全';
    taDot = 'green';
  }

  return [
    { name: '万福玛利亚号', status: hmStatus, dot: hmDot },
    { name: '目标A', status: taStatus, dot: taDot },
  ];
}

function getCharacterStatuses(chronoTime: number): EntityStatus[] {
  // Grace / 格雷斯
  let graceStatus: string;
  let graceDot: DotColor;
  if (chronoTime < 380) {
    graceStatus = '地球 · 教师';
    graceDot = 'green';
  } else if (chronoTime < 1460) {
    graceStatus = '地球 · 研究员';
    graceDot = 'green';
  } else if (chronoTime < 2920) {
    graceStatus = '星际旅途 · 休眠中';
    graceDot = 'yellow';
  } else if (chronoTime < 3170) {
    graceStatus = '鲸鱼座τ · 与洛基合作';
    graceDot = 'green';
  } else if (chronoTime < 3290) {
    graceStatus = '独自返航';
    graceDot = 'yellow';
  } else if (chronoTime < 3470) {
    graceStatus = '搜救洛基';
    graceDot = 'red';
  } else if (chronoTime < 5000) {
    graceStatus = '前往波江座40';
    graceDot = 'green';
  } else {
    graceStatus = '波江b · 教师';
    graceDot = 'green';
  }

  // Rocky / 洛基
  let rockyStatus: string;
  let rockyDot: DotColor;
  if (chronoTime < 2932) {
    rockyStatus = '未知';
    rockyDot = 'gray';
  } else if (chronoTime < 3021) {
    rockyStatus = '合作伙伴';
    rockyDot = 'green';
  } else if (chronoTime < 3045) {
    rockyStatus = '受伤恢复中';
    rockyDot = 'red';
  } else if (chronoTime < 3170) {
    rockyStatus = '合作伙伴';
    rockyDot = 'green';
  } else if (chronoTime < 3230) {
    rockyStatus = '返回波江座40';
    rockyDot = 'yellow';
  } else if (chronoTime < 3386) {
    rockyStatus = '失去动力 · 危险';
    rockyDot = 'red';
  } else if (chronoTime < 3470) {
    rockyStatus = '已救援';
    rockyDot = 'green';
  } else {
    rockyStatus = '波江座40 · 安全';
    rockyDot = 'green';
  }

  // Stratt / 斯特拉特
  let strattStatus: string;
  let strattDot: DotColor;
  if (chronoTime < 380) {
    strattStatus = '不在场';
    strattDot = 'gray';
  } else if (chronoTime < 1460) {
    strattStatus = '项目总指挥';
    strattDot = 'green';
  } else {
    strattStatus = '留在地球';
    strattDot = 'gray';
  }

  return [
    { name: '格雷斯', status: graceStatus, dot: graceDot },
    { name: '洛基', status: rockyStatus, dot: rockyDot },
    { name: '斯特拉特', status: strattStatus, dot: strattDot },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════
 * Dot color map
 * ═══════════════════════════════════════════════════════════════════════ */

const DOT_COLORS: Record<DotColor, string> = {
  green: '#44cc88',
  yellow: '#ccaa44',
  gray: 'rgba(255,255,255,0.25)',
  red: '#cc4455',
};

/* ═══════════════════════════════════════════════════════════════════════
 * Styles
 * ═══════════════════════════════════════════════════════════════════════ */

const S = {
  panel: {
    position: 'fixed',
    left: 20,
    top: 80,
    bottom: 120,
    width: 260,
    zIndex: 80,
    background: 'rgba(10, 10, 30, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    pointerEvents: 'auto',
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  } satisfies CSSProperties,

  /* ── Section containers ──────────────────────────────────────────── */

  sectionA: {
    padding: '14px 16px 10px',
    flexShrink: 0,
  } satisfies CSSProperties,

  sectionB: {
    padding: '10px 16px',
    flexShrink: 0,
  } satisfies CSSProperties,

  sectionC: {
    padding: '10px 16px 14px',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  } satisfies CSSProperties,

  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    margin: '0 12px',
    flexShrink: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
  } satisfies CSSProperties,

  /* ── Section header ──────────────────────────────────────────────── */

  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    marginBottom: 8,
    lineHeight: 1,
  } satisfies CSSProperties,

  /* ── Entity group label (Stars / Ships / Characters) ─────────────── */

  groupLabel: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'rgba(255, 255, 255, 0.2)',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 1,
  } satisfies CSSProperties,

  /* ── Entity row ──────────────────────────────────────────────────── */

  entityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '3px 0',
    lineHeight: 1.3,
  } satisfies CSSProperties,

  entityDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 400ms ease',
  } satisfies CSSProperties,

  entityName: {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.75)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,

  entityStatus: {
    fontSize: 10,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'opacity 300ms ease',
  } satisfies CSSProperties,

  /* ── Event Synopsis (Section B) ──────────────────────────────────── */

  synopsisLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 1.3,
    marginBottom: 2,
    transition: 'opacity 300ms ease',
  } satisfies CSSProperties,

  synopsisChapter: {
    fontSize: 10,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: '0.04em',
    marginBottom: 6,
    transition: 'opacity 300ms ease',
  } satisfies CSSProperties,

  synopsisDesc: {
    fontSize: 12,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'opacity 300ms ease',
  } satisfies CSSProperties,

  synopsisEmpty: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.2)',
    fontStyle: 'italic',
  } satisfies CSSProperties,

  /* ── Event Log (Section C) ───────────────────────────────────────── */

  logScroll: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    /* thin custom scrollbar */
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.08) transparent',
  } satisfies CSSProperties,

  logEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 0',
    cursor: 'pointer',
    transition: 'opacity 200ms ease',
    lineHeight: 1.3,
  } satisfies CSSProperties,

  logDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  } satisfies CSSProperties,

  logLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.65)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,

  logChapter: {
    fontSize: 9,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.25)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * Importance → color for log dots
 * ═══════════════════════════════════════════════════════════════════════ */

function importanceDotColor(importance: number): string {
  switch (importance) {
    case 1: return 'rgba(100, 180, 255, 0.8)';
    case 2: return 'rgba(100, 180, 255, 0.45)';
    default: return 'rgba(255, 255, 255, 0.15)';
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Sub-components
 * ═══════════════════════════════════════════════════════════════════════ */

function EntityRow({ entity }: { entity: EntityStatus }) {
  return (
    <div style={S.entityRow}>
      <div
        style={{
          ...S.entityDot,
          background: DOT_COLORS[entity.dot],
          boxShadow: entity.dot === 'gray'
            ? 'none'
            : `0 0 4px ${DOT_COLORS[entity.dot]}66`,
        }}
      />
      <span style={S.entityName}>{entity.name}</span>
      <span style={S.entityStatus}>{entity.status}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

export function StatusPanel() {
  const storyProgress = useTimelineStore((s) => s.storyProgress);
  const setProgress = useTimelineStore((s) => s.setProgress);
  const data = useTimelineData();

  const chronoTime = data.progressToTime(storyProgress);

  /* ── Section A: Entity statuses ────────────────────────────────── */

  const stars = useMemo(() => getStarStatuses(chronoTime), [chronoTime]);
  const ships = useMemo(() => getShipStatuses(chronoTime), [chronoTime]);
  const chars = useMemo(() => getCharacterStatuses(chronoTime), [chronoTime]);

  /* ── Section B: Event synopsis (crossfade) ─────────────────────── */

  const nearestEvt = data.nearestEvent(storyProgress);
  const [displayedEvt, setDisplayedEvt] = useState<TimelineEvent | null>(null);
  const [synopsisOpacity, setSynopsisOpacity] = useState(1);
  const prevEvtIdRef = useRef<string | null>(null);

  useEffect(() => {
    const newId = nearestEvt?.id ?? null;
    if (newId === prevEvtIdRef.current) return;
    prevEvtIdRef.current = newId;

    // Crossfade: fade out, swap, fade in
    setSynopsisOpacity(0);
    const timer = setTimeout(() => {
      setDisplayedEvt(nearestEvt ?? null);
      setSynopsisOpacity(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [nearestEvt]);

  /* ── Section C: Passed events log ──────────────────────────────── */

  const passedEvents = useMemo(() => {
    return data.eventsByProgress
      .filter((ep) => ep.progress <= storyProgress + 0.001)
      .reverse()
      .slice(0, 8);
  }, [data.eventsByProgress, storyProgress]);

  const handleLogClick = useCallback(
    (progress: number) => {
      setProgress(progress);
    },
    [setProgress],
  );

  return (
    <div style={S.panel}>
      {/* ── Section A: Entity Tracker ──────────────────────────────── */}
      <div style={S.sectionA}>
        <div style={S.sectionTitle}>{'ENTITY TRACKER'}</div>

        <div style={S.groupLabel}>{'STARS'}</div>
        {stars.map((e) => (
          <EntityRow key={e.name} entity={e} />
        ))}

        <div style={S.groupLabel}>{'SHIPS'}</div>
        {ships.map((e) => (
          <EntityRow key={e.name} entity={e} />
        ))}

        <div style={S.groupLabel}>{'CHARACTERS'}</div>
        {chars.map((e) => (
          <EntityRow key={e.name} entity={e} />
        ))}
      </div>

      <hr style={S.divider} />

      {/* ── Section B: Event Synopsis ──────────────────────────────── */}
      <div style={S.sectionB}>
        <div style={S.sectionTitle}>{'EVENT'}</div>
        {displayedEvt ? (
          <div style={{ opacity: synopsisOpacity, transition: 'opacity 300ms ease' }}>
            <div style={S.synopsisLabel}>{displayedEvt.label}</div>
            <div style={S.synopsisChapter}>
              {'第' + displayedEvt.chapter + '章'}
            </div>
            <div style={S.synopsisDesc}>{displayedEvt.description}</div>
          </div>
        ) : (
          <div style={S.synopsisEmpty}>{'--'}</div>
        )}
      </div>

      <hr style={S.divider} />

      {/* ── Section C: Event Log ───────────────────────────────────── */}
      <div style={S.sectionC}>
        <div style={S.sectionTitle}>{'EVENT LOG'}</div>
        <div style={S.logScroll}>
          {passedEvents.length === 0 && (
            <div style={S.synopsisEmpty}>{'--'}</div>
          )}
          {passedEvents.map((ep, i) => (
            <div
              key={ep.event.id}
              style={{
                ...S.logEntry,
                opacity: Math.max(0.25, 1 - i * 0.1),
              }}
              onClick={() => handleLogClick(ep.progress)}
              title={ep.event.description}
            >
              <div
                style={{
                  ...S.logDot,
                  background: importanceDotColor(ep.event.importance),
                }}
              />
              <span style={S.logLabel}>{ep.event.label}</span>
              <span style={S.logChapter}>{'第' + ep.event.chapter + '章'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatusPanel;
