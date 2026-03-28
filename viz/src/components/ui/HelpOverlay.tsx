/**
 * HelpOverlay.tsx — Keyboard shortcuts / controls guide.
 *
 * Modal overlay triggered by '?' key or a help button.
 * Semi-transparent dark backdrop, centered glass card, clean typography.
 * Dismiss with Escape, '?', or clicking outside.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { useUIStore } from '../../stores/useUIStore';

/* ═══════════════════════════════════════════════════════════════════════
 * Shortcut definitions
 * ═══════════════════════════════════════════════════════════════════════ */

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Playback',
    shortcuts: [
      { keys: ['Space'], description: 'Play / Pause' },
      { keys: ['\u2190 / \u2192'], description: 'Fine scrub (\u00b10.5%)' },
      { keys: ['Shift', '\u2190 / \u2192'], description: 'Jump (\u00b15%)' },
      { keys: ['J'], description: 'Previous event' },
      { keys: ['K'], description: 'Next event' },
      { keys: ['Alt', '\u2190 / \u2192'], description: 'Prev / Next event' },
    ],
  },
  {
    title: 'Camera',
    shortcuts: [
      { keys: ['R'], description: 'Reset camera / \u91CD\u7F6E\u955C\u5934' },
    ],
  },
  {
    title: 'Interface',
    shortcuts: [
      { keys: ['?'], description: 'Toggle this help overlay' },
      { keys: ['Esc'], description: 'Close panels / overlays' },
    ],
  },
  {
    title: 'Timeline',
    shortcuts: [
      { keys: ['Click'], description: 'Seek to position' },
      { keys: ['Drag'], description: 'Scrub through timeline' },
      { keys: ['Marker Click'], description: 'Open event details' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * Styles
 * ═══════════════════════════════════════════════════════════════════════ */

const S = {
  /* ── Overlay backdrop ────────────────────────────────────────────── */
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 300ms ease-out, backdrop-filter 300ms ease-out',
    willChange: 'opacity',
  } satisfies CSSProperties,

  overlayVisible: {
    opacity: 1,
    pointerEvents: 'auto',
    background: 'rgba(3, 3, 8, 0.7)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } satisfies CSSProperties,

  overlayHidden: {
    opacity: 0,
    pointerEvents: 'none',
    background: 'rgba(3, 3, 8, 0)',
    backdropFilter: 'blur(0px)',
    WebkitBackdropFilter: 'blur(0px)',
  } satisfies CSSProperties,

  /* ── Card ────────────────────────────────────────────────────────── */
  card: {
    width: 480,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'calc(100vh - 96px)',
    overflowY: 'auto',
    background: 'rgba(14, 14, 36, 0.92)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: '32px 28px',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
    transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out',
    willChange: 'transform, opacity',
  } satisfies CSSProperties,

  cardVisible: {
    transform: 'scale(1) translateY(0)',
    opacity: 1,
  } satisfies CSSProperties,

  cardHidden: {
    transform: 'scale(0.96) translateY(12px)',
    opacity: 0,
  } satisfies CSSProperties,

  /* ── Title ───────────────────────────────────────────────────────── */
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e8e8f0',
    marginBottom: 24,
    letterSpacing: '-0.01em',
  } satisfies CSSProperties,

  /* ── Group ───────────────────────────────────────────────────────── */
  group: {
    marginBottom: 20,
  } satisfies CSSProperties,

  groupTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  } satisfies CSSProperties,

  /* ── Shortcut row ────────────────────────────────────────────────── */
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    gap: 16,
  } satisfies CSSProperties,

  keysGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  } satisfies CSSProperties,

  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 26,
    padding: '0 8px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", "Segoe UI", monospace',
    color: 'rgba(255, 255, 255, 0.75)',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  } satisfies CSSProperties,

  kbdPlus: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.2)',
    margin: '0 2px',
  } satisfies CSSProperties,

  desc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: 400,
    textAlign: 'right',
  } satisfies CSSProperties,

  /* ── Close hint ──────────────────────────────────────────────────── */
  closeHint: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.2)',
    fontWeight: 500,
  } satisfies CSSProperties,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

export function HelpOverlay() {
  const { helpVisible, toggleHelp } = useUIStore();
  const [closeBtnHover, setCloseBtnHover] = useState(false);

  // '?' key to toggle, Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        toggleHelp();
      }
      if (e.key === 'Escape' && helpVisible) {
        toggleHelp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpVisible, toggleHelp]);

  return (
    <div
      style={{
        ...S.overlay,
        ...(helpVisible ? S.overlayVisible : S.overlayHidden),
      }}
      onClick={toggleHelp}
    >
      <div
        style={{
          ...S.card,
          ...(helpVisible ? S.cardVisible : S.cardHidden),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={S.title}>Keyboard Shortcuts</h2>
          <button
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: closeBtnHover ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              color: closeBtnHover ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 200ms ease-out',
              fontSize: 14,
              lineHeight: 1,
              outline: 'none',
            }}
            onClick={toggleHelp}
            onMouseEnter={() => setCloseBtnHover(true)}
            onMouseLeave={() => setCloseBtnHover(false)}
            aria-label="Close help"
          >
            &#x2715;
          </button>
        </div>

        {/* Shortcut groups */}
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} style={S.group}>
            <div style={S.groupTitle}>{group.title}</div>
            {group.shortcuts.map((shortcut, si) => (
              <div key={si} style={S.row}>
                <div style={S.keysGroup}>
                  {shortcut.keys.map((key, ki) => (
                    <span key={ki}>
                      {ki > 0 && <span style={S.kbdPlus}>+</span>}
                      <kbd style={S.kbd}>{key}</kbd>
                    </span>
                  ))}
                </div>
                <span style={S.desc as CSSProperties}>{shortcut.description}</span>
              </div>
            ))}
          </div>
        ))}

        {/* Close hint */}
        <div style={S.closeHint as CSSProperties}>
          Press <kbd style={{ ...S.kbd, height: 22, minWidth: 22, fontSize: 10, padding: '0 6px' }}>?</kbd> or <kbd style={{ ...S.kbd, height: 22, minWidth: 22, fontSize: 10, padding: '0 6px' }}>Esc</kbd> to dismiss
        </div>
      </div>
    </div>
  );
}

export default HelpOverlay;
