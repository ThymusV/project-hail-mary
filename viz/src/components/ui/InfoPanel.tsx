/**
 * InfoPanel.tsx — Event details panel.
 *
 * Slides in from the right when an event is selected.
 * Glassmorphism, smooth spring-like animation, rich event metadata.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useTimelineData, type TimelineEvent } from '../../hooks/useTimelineData';

/* ═══════════════════════════════════════════════════════════════════════
 * Actor display names
 * ═══════════════════════════════════════════════════════════════════════ */

const ACTOR_NAMES: Record<string, string> = {
  grace: '瑞安·格雷斯',
  rocky: '洛基',
  stratt: '伊娃·斯特拉特',
  petrova: '佩特洛娃',
  marissa: '玛丽莎',
  yao: '姚立杰',
  ilyukhina: '奥蕾萨·伊柳希娜',
  dubois: '杜波依斯',
  shapiro: '夏皮罗',
  dimitri: '迪米特里',
  xi: '习博士',
  lamai: '拉迈医生',
  lokken: '洛肯博士',
  redell: '瑞德尔',
};

/* ═══════════════════════════════════════════════════════════════════════
 * Styles
 * ═══════════════════════════════════════════════════════════════════════ */

const S = {
  /* ── Backdrop (click to close) ───────────────────────────────────── */
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    pointerEvents: 'auto',
  } satisfies CSSProperties,

  /* ── Panel ───────────────────────────────────────────────────────── */
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 100, // clear the timeline slider area
    width: 380,
    zIndex: 210,
    background: 'rgba(10, 10, 30, 0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease-out',
    willChange: 'transform, opacity',
  } satisfies CSSProperties,

  panelHidden: {
    transform: 'translateX(100%)',
    opacity: 0,
    pointerEvents: 'none',
  } satisfies CSSProperties,

  panelVisible: {
    transform: 'translateX(0)',
    opacity: 1,
    pointerEvents: 'auto',
  } satisfies CSSProperties,

  /* ── Close button ────────────────────────────────────────────────── */
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: '50%',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease-out',
    zIndex: 2,
    outline: 'none',
    fontSize: 16,
    lineHeight: 1,
  } satisfies CSSProperties,

  closeBtnHover: {
    background: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: 'rgba(255, 255, 255, 0.8)',
  } satisfies CSSProperties,

  /* ── Content ─────────────────────────────────────────────────────── */
  content: {
    padding: '28px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    flex: 1,
  } satisfies CSSProperties,

  /* ── Header area ─────────────────────────────────────────────────── */
  headerArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingRight: 40, // clear close button
  } satisfies CSSProperties,

  /* ── Importance indicator ────────────────────────────────────────── */
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  } satisfies CSSProperties,

  /* ── Label ───────────────────────────────────────────────────────── */
  label: {
    fontSize: 24,
    fontWeight: 700,
    color: '#e8e8f0',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  } satisfies CSSProperties,

  /* ── Chapter tag ─────────────────────────────────────────────────── */
  chapterTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255, 255, 255, 0.45)',
    background: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 999,
    padding: '4px 12px',
    width: 'fit-content',
  } satisfies CSSProperties,

  /* ── Meta row ────────────────────────────────────────────────────── */
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 500,
  } satisfies CSSProperties,

  metaDivider: {
    width: 1,
    height: 12,
    background: 'rgba(255, 255, 255, 0.1)',
    flexShrink: 0,
  } satisfies CSSProperties,

  /* ── Separator ───────────────────────────────────────────────────── */
  separator: {
    height: 1,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
  } satisfies CSSProperties,

  /* ── Description ─────────────────────────────────────────────────── */
  description: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 400,
  } satisfies CSSProperties,

  /* ── Section ─────────────────────────────────────────────────────── */
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 8,
  } satisfies CSSProperties,

  /* ── Actor pills ─────────────────────────────────────────────────── */
  actorsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  } satisfies CSSProperties,

  actorPill: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.65)',
    background: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 999,
    padding: '4px 12px',
    transition: 'all 200ms ease-out',
  } satisfies CSSProperties,

  /* ── Tag pills ───────────────────────────────────────────────────── */
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
  } satisfies CSSProperties,

  tag: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: 'rgba(136, 187, 255, 0.7)',
    background: 'rgba(68, 136, 255, 0.08)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(68, 136, 255, 0.12)',
    borderRadius: 999,
    padding: '3px 10px',
  } satisfies CSSProperties,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * Importance color helper
 * ═══════════════════════════════════════════════════════════════════════ */

function importanceColor(importance: number): string {
  switch (importance) {
    case 1:
      return '#66aaff';
    case 2:
      return 'rgba(255, 255, 255, 0.5)';
    default:
      return 'rgba(255, 255, 255, 0.2)';
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

export function InfoPanel() {
  const { infoPanelVisible, selectedEventId, hideInfoPanel } = useUIStore();
  const data = useTimelineData();
  const [closeBtnHover, setCloseBtnHover] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Resolve event
  const event: TimelineEvent | undefined = selectedEventId
    ? data.eventById(selectedEventId)
    : undefined;

  const scene = event ? data.sceneById(event.sceneId) : undefined;
  const missionDay = event ? Math.round(event.chronologicalTime) : 0;

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && infoPanelVisible) {
        hideInfoPanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoPanelVisible, hideInfoPanel]);

  // Scroll to top when event changes
  useEffect(() => {
    if (panelRef.current && selectedEventId) {
      panelRef.current.scrollTop = 0;
    }
  }, [selectedEventId]);

  const isVisible = infoPanelVisible && event;

  return (
    <>
      {/* Invisible backdrop to capture outside clicks */}
      {isVisible && (
        <div
          style={S.backdrop}
          onClick={hideInfoPanel}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          ...S.panel,
          ...(isVisible ? S.panelVisible : S.panelHidden),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {event && (
          <div style={S.content}>
            {/* Close button */}
            <button
              style={{
                ...S.closeBtn,
                ...(closeBtnHover ? S.closeBtnHover : {}),
              }}
              onClick={hideInfoPanel}
              onMouseEnter={() => setCloseBtnHover(true)}
              onMouseLeave={() => setCloseBtnHover(false)}
              aria-label="Close panel"
            >
              &#x2715;
            </button>

            {/* Header */}
            <div style={S.headerArea}>
              {/* Chapter tag with importance dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    ...S.importanceDot,
                    background: importanceColor(event.importance),
                    boxShadow:
                      event.importance === 1
                        ? '0 0 8px rgba(68, 136, 255, 0.4)'
                        : 'none',
                  }}
                />
                <span style={S.chapterTag}>
                  第 {event.chapter} 章
                </span>
              </div>

              {/* Label */}
              <h2 style={S.label}>{event.label}</h2>

              {/* Meta row */}
              <div style={S.metaRow}>
                <span>Day {missionDay}</span>
                <div style={S.metaDivider} />
                <span>{scene?.label ?? event.sceneId}</span>
                <div style={S.metaDivider} />
                <span>
                  {event.importance === 1
                    ? 'Major'
                    : event.importance === 2
                      ? 'Notable'
                      : 'Minor'}
                </span>
              </div>
            </div>

            <div style={S.separator} />

            {/* Description */}
            <p style={S.description}>{event.description}</p>

            {/* Actors */}
            {event.actors.length > 0 && (
              <div>
                <div style={S.sectionTitle}>Characters</div>
                <div style={S.actorsRow}>
                  {event.actors.map((actor) => (
                    <span key={actor} style={S.actorPill}>
                      {ACTOR_NAMES[actor] ?? actor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags.length > 0 && (
              <div>
                <div style={S.sectionTitle}>Tags</div>
                <div style={S.tagsRow}>
                  {event.tags.map((tag) => (
                    <span key={tag} style={S.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default InfoPanel;
