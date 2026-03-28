/**
 * TimelineSlider.tsx — The main timeline scrubber.
 *
 * Full-width bar at the bottom of the viewport. Glassmorphism design,
 * smooth micro-animations, keyboard shortcuts, event markers, and
 * playback controls.  Must feel as polished as Apple Music's playback bar.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTimelineData } from '../../hooks/useTimelineData';

/* ═══════════════════════════════════════════════════════════════════════
 * Styles — all inline for zero-dependency portability.
 * ═══════════════════════════════════════════════════════════════════════ */

const S = {
  /* ── Wrapper ─────────────────────────────────────────────────────── */
  wrapper: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    pointerEvents: 'none',
    padding: '0 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    userSelect: 'none',
  } satisfies CSSProperties,

  /* ── Glass container ─────────────────────────────────────────────── */
  container: {
    pointerEvents: 'auto',
    background: 'rgba(10, 10, 30, 0.55)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: '12px 20px 16px',
    transition: 'background 250ms ease-out, border-color 250ms ease-out',
  } satisfies CSSProperties,

  containerHover: {
    background: 'rgba(10, 10, 30, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  } satisfies CSSProperties,

  /* ── Top row: metadata + controls ────────────────────────────────── */
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  } satisfies CSSProperties,

  metaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    minWidth: 0,
    flex: '0 1 auto',
  } satisfies CSSProperties,

  missionText: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.04em',
    color: 'rgba(255, 255, 255, 0.45)',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  } satisfies CSSProperties,

  eventLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.85)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 260,
    transition: 'opacity 300ms ease-out',
  } satisfies CSSProperties,

  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  } satisfies CSSProperties,

  sceneText: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.04em',
    color: 'rgba(255, 255, 255, 0.35)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  } satisfies CSSProperties,

  /* ── Play / Pause ────────────────────────────────────────────────── */
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease-out',
    flexShrink: 0,
    outline: 'none',
  } satisfies CSSProperties,

  playBtnHover: {
    background: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)',
  } satisfies CSSProperties,

  /* ── Step prev / next buttons ───────────────────────────────────── */
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease-out',
    flexShrink: 0,
    outline: 'none',
    padding: 0,
  } satisfies CSSProperties,

  stepBtnHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    color: 'rgba(255, 255, 255, 0.9)',
    transform: 'scale(1.08)',
  } satisfies CSSProperties,

  /* ── Recenter button ────────────────────────────────────────────── */
  recenterBtn: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease-out',
    flexShrink: 0,
    outline: 'none',
    padding: 0,
    marginLeft: 4,
    position: 'relative',
  } satisfies CSSProperties,

  recenterBtnHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    color: 'rgba(255, 255, 255, 0.9)',
    transform: 'scale(1.08)',
  } satisfies CSSProperties,

  /* ── Speed selector ──────────────────────────────────────────────── */
  speedGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 999,
    padding: '2px 3px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  } satisfies CSSProperties,

  speedBtn: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.02em',
    padding: '4px 10px',
    borderRadius: 999,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    transition: 'all 200ms ease-out',
    outline: 'none',
  } satisfies CSSProperties,

  speedBtnActive: {
    background: 'rgba(68, 136, 255, 0.2)',
    color: '#88bbff',
  } satisfies CSSProperties,

  speedBtnHover: {
    color: 'rgba(255, 255, 255, 0.7)',
  } satisfies CSSProperties,

  /* ── Track area ──────────────────────────────────────────────────── */
  trackArea: {
    position: 'relative',
    height: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  } satisfies CSSProperties,

  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    top: '50%',
    transform: 'translateY(-50%)',
    transition: 'height 200ms ease-out',
  } satisfies CSSProperties,

  trackBgExpanded: {
    height: 6,
  } satisfies CSSProperties,

  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    background: 'linear-gradient(90deg, #4488ff, #66aaff)',
    transition: 'width 60ms linear',
  } satisfies CSSProperties,

  /* ── Thumb ──────────────────────────────────────────────────────── */
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 0 0 3px rgba(68, 136, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.4)',
    top: '50%',
    transform: 'translate(-50%, -50%) scale(1)',
    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease-out',
    zIndex: 3,
    pointerEvents: 'none',
  } satisfies CSSProperties,

  thumbActive: {
    transform: 'translate(-50%, -50%) scale(1.25)',
    boxShadow: '0 0 0 4px rgba(68, 136, 255, 0.35), 0 0 16px rgba(68, 136, 255, 0.25), 0 2px 12px rgba(0, 0, 0, 0.5)',
  } satisfies CSSProperties,

  /* ── Event marker ──────────────────────────────────────────────── */
  marker: {
    position: 'absolute',
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 1.5,
    transform: 'translate(-50%, -50%) rotate(45deg)',
    zIndex: 1,
    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out',
    cursor: 'pointer',
    pointerEvents: 'auto',
  } satisfies CSSProperties,

  markerHover: {
    transform: 'translate(-50%, -50%) rotate(45deg) scale(1.6)',
  } satisfies CSSProperties,

  /* ── Tooltip ───────────────────────────────────────────────────── */
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 14,
    padding: '6px 12px',
    background: 'rgba(10, 10, 30, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.9)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 200ms ease-out, transform 200ms ease-out',
    zIndex: 10,
  } satisfies CSSProperties,

  tooltipVisible: {
    opacity: 1,
  } satisfies CSSProperties,

  /* ── Mini tooltip (for recenter) ────────────────────────────────── */
  miniTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    padding: '4px 10px',
    background: 'rgba(10, 10, 30, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.8)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 200ms ease-out',
    zIndex: 10,
  } satisfies CSSProperties,

  miniTooltipVisible: {
    opacity: 1,
  } satisfies CSSProperties,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SVG icons
 * ═══════════════════════════════════════════════════════════════════════ */

function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PrevIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="3" height="16" rx="1" />
      <path d="M20 4v16l-11-8 11-8z" />
    </svg>
  );
}

function NextIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="17" y="4" width="3" height="16" rx="1" />
      <path d="M4 4v16l11-8L4 4z" />
    </svg>
  );
}

function RecenterIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

const SPEEDS = [1, 10, 100] as const;

export function TimelineSlider() {
  const {
    storyProgress,
    isPlaying,
    playbackSpeed,
    setProgress,
    togglePlay,
    setSpeed,
    stepToNextEvent,
    stepToPrevEvent,
    requestRecenter,
  } = useTimelineStore();

  const showInfoPanel = useUIStore((s) => s.showInfoPanel);
  const data = useTimelineData();

  /* ── Local UI state ──────────────────────────────────────────────── */
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [playBtnHover, setPlayBtnHover] = useState(false);
  const [prevBtnHover, setPrevBtnHover] = useState(false);
  const [nextBtnHover, setNextBtnHover] = useState(false);
  const [recenterHover, setRecenterHover] = useState(false);
  const [hoveredSpeed, setHoveredSpeed] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  /* ── Derived data ───────────────────────────────────────────────── */
  const chronoTime = data.progressToTime(storyProgress);
  const missionDay = Math.round(chronoTime);
  const earthYear = data.dayToYear(chronoTime);
  const currentScene = data.sceneAtProgress(storyProgress);
  const nearestEvt = data.nearestEvent(storyProgress);

  /* ── Stable ref to eventsByProgress for keyboard handler ─────────── */
  const eventsRef = useRef(data.eventsByProgress);
  eventsRef.current = data.eventsByProgress;

  /* ── Progress from mouse position ────────────────────────────────── */
  const progressFromPointer = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return storyProgress;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(1, ratio));
    },
    [storyProgress],
  );

  /* ── Mouse / pointer drag ────────────────────────────────────────── */
  const handleTrackDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      setProgress(progressFromPointer(e.clientX));
    },
    [progressFromPointer, setProgress],
  );

  const handleTrackMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setProgress(progressFromPointer(e.clientX));
    },
    [isDragging, progressFromPointer, setProgress],
  );

  const handleTrackUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /* ── Keyboard shortcuts ──────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.altKey) {
            // Alt+Left: previous event
            stepToPrevEvent(eventsRef.current);
          } else {
            setProgress(storyProgress - (e.shiftKey ? 0.05 : 0.005));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.altKey) {
            // Alt+Right: next event
            stepToNextEvent(eventsRef.current);
          } else {
            setProgress(storyProgress + (e.shiftKey ? 0.05 : 0.005));
          }
          break;
        case 'KeyJ':
          e.preventDefault();
          stepToPrevEvent(eventsRef.current);
          break;
        case 'KeyK':
          e.preventDefault();
          stepToNextEvent(eventsRef.current);
          break;
        case 'KeyR':
          // Don't intercept if any modifier is held (Ctrl+R = refresh, etc.)
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            requestRecenter();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [storyProgress, togglePlay, setProgress, stepToNextEvent, stepToPrevEvent, requestRecenter]);

  /* ── Track expansion state ───────────────────────────────────────── */
  const trackExpanded = isDragging || isHovering;
  const pct = `${storyProgress * 100}%`;

  return (
    <div style={S.wrapper}>
      <div
        style={{
          ...S.container,
          ...(isHovering || isDragging ? S.containerHover : {}),
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setHoveredMarkerId(null);
        }}
      >
        {/* ── Top row ────────────────────────────────────────────── */}
        <div style={S.topRow}>
          {/* Left: mission info + event label */}
          <div style={S.metaLeft}>
            <span style={S.missionText}>
              Day {missionDay} | {earthYear}
            </span>
            <span
              style={{
                ...S.eventLabel,
                opacity: nearestEvt ? 1 : 0,
              }}
            >
              {nearestEvt?.label ?? ''}
            </span>
          </div>

          {/* Center: playback controls */}
          <div style={S.controls}>
            {/* Prev event */}
            <button
              style={{
                ...S.stepBtn,
                ...(prevBtnHover ? S.stepBtnHover : {}),
              }}
              onClick={(e) => {
                e.stopPropagation();
                stepToPrevEvent(data.eventsByProgress);
              }}
              onMouseEnter={() => setPrevBtnHover(true)}
              onMouseLeave={() => setPrevBtnHover(false)}
              aria-label="Previous event"
              title="Previous event (J)"
            >
              <PrevIcon />
            </button>

            {/* Play / Pause */}
            <button
              style={{
                ...S.playBtn,
                ...(playBtnHover ? S.playBtnHover : {}),
              }}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              onMouseEnter={() => setPlayBtnHover(true)}
              onMouseLeave={() => setPlayBtnHover(false)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isPlaying ? 'scale(1)' : 'scale(1)',
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </div>
            </button>

            {/* Next event */}
            <button
              style={{
                ...S.stepBtn,
                ...(nextBtnHover ? S.stepBtnHover : {}),
              }}
              onClick={(e) => {
                e.stopPropagation();
                stepToNextEvent(data.eventsByProgress);
              }}
              onMouseEnter={() => setNextBtnHover(true)}
              onMouseLeave={() => setNextBtnHover(false)}
              aria-label="Next event"
              title="Next event (K)"
            >
              <NextIcon />
            </button>

            <div style={S.speedGroup}>
              {SPEEDS.map((spd) => {
                const active = playbackSpeed === spd;
                const hovered = hoveredSpeed === spd;
                return (
                  <button
                    key={spd}
                    style={{
                      ...S.speedBtn,
                      ...(active ? S.speedBtnActive : {}),
                      ...(!active && hovered ? S.speedBtnHover : {}),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpeed(spd);
                    }}
                    onMouseEnter={() => setHoveredSpeed(spd)}
                    onMouseLeave={() => setHoveredSpeed(null)}
                    aria-label={`Speed ${spd}x`}
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>

            {/* Recenter camera */}
            <button
              style={{
                ...S.recenterBtn,
                ...(recenterHover ? S.recenterBtnHover : {}),
              }}
              onClick={(e) => {
                e.stopPropagation();
                requestRecenter();
              }}
              onMouseEnter={() => setRecenterHover(true)}
              onMouseLeave={() => setRecenterHover(false)}
              aria-label="Reset camera"
            >
              <RecenterIcon />
              {/* Tooltip */}
              <div
                style={{
                  ...S.miniTooltip,
                  ...(recenterHover ? S.miniTooltipVisible : {}),
                }}
              >
                Reset camera / 重置镜头 (R)
              </div>
            </button>
          </div>

          {/* Right: scene name */}
          <span style={S.sceneText}>{currentScene?.label ?? ''}</span>
        </div>

        {/* ── Track ──────────────────────────────────────────────── */}
        <div
          ref={trackRef}
          style={S.trackArea}
          onPointerDown={handleTrackDown}
          onPointerMove={handleTrackMove}
          onPointerUp={handleTrackUp}
          onPointerCancel={handleTrackUp}
        >
          {/* Background track */}
          <div
            style={{
              ...S.trackBg,
              ...(trackExpanded ? S.trackBgExpanded : {}),
            }}
          >
            {/* Filled portion */}
            <div style={{ ...S.trackFill, width: pct }} />
          </div>

          {/* Event markers */}
          {data.eventsByProgress.map(({ event, progress }) => {
            if (event.importance > 2) return null;
            const isHovered = hoveredMarkerId === event.id;
            const color =
              event.importance === 1
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(255, 255, 255, 0.35)';
            return (
              <div
                key={event.id}
                style={{
                  ...S.marker,
                  left: `${progress * 100}%`,
                  background: color,
                  ...(isHovered ? S.markerHover : {}),
                }}
                onMouseEnter={() => setHoveredMarkerId(event.id)}
                onMouseLeave={() => setHoveredMarkerId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  showInfoPanel(event.id);
                  setProgress(progress);
                }}
              >
                {/* Tooltip */}
                <div
                  style={{
                    ...S.tooltip,
                    ...(isHovered ? S.tooltipVisible : {}),
                  }}
                >
                  {event.label}
                </div>
              </div>
            );
          })}

          {/* Thumb */}
          <div
            style={{
              ...S.thumb,
              left: pct,
              ...(trackExpanded ? S.thumbActive : {}),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default TimelineSlider;
