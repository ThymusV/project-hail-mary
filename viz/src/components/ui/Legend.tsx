/**
 * Legend — fixed overlay showing what each color/symbol means.
 *
 * Positioned bottom-right, above the timeline slider.
 * Collapsible to save space. Glassmorphism style.
 */

import { useState, type CSSProperties } from 'react';

// ── Legend data ──────────────────────────────────────────────────────

interface LegendEntry {
  color: string;
  shape: 'line' | 'circle' | 'diamond' | 'ring';
  label: string;
  labelEN: string;
}

const TRAJECTORY_ENTRIES: LegendEntry[] = [
  { color: '#4488ff', shape: 'line', label: '出发航线', labelEN: 'Sol → Tau Ceti' },
  { color: '#44ddff', shape: 'line', label: '返程航线', labelEN: 'Partial return' },
  { color: '#ff6644', shape: 'line', label: '营救航线', labelEN: 'Rescue turnaround' },
  { color: '#ffaa33', shape: 'line', label: '前往波江座', labelEN: '→ 40 Eridani' },
];

const STAR_ENTRIES: LegendEntry[] = [
  { color: '#fff4e8', shape: 'circle', label: '太阳 (G2V)', labelEN: 'Sol' },
  { color: '#ffecd0', shape: 'circle', label: '鲸鱼座τ (G8.5V)', labelEN: 'Tau Ceti' },
  { color: '#ffd8a8', shape: 'circle', label: '波江座40 (K1V)', labelEN: '40 Eridani A' },
];

const OBJECT_ENTRIES: LegendEntry[] = [
  { color: '#3366cc', shape: 'ring', label: '地球', labelEN: 'Earth' },
  { color: '#88bbff', shape: 'diamond', label: '万福玛利亚号', labelEN: 'Hail Mary' },
  { color: '#ff8833', shape: 'diamond', label: '目标A (洛基)', labelEN: "Target A (Rocky)" },
];

const MARKER_ENTRIES: LegendEntry[] = [
  { color: '#44ddff', shape: 'circle', label: '分离点', labelEN: 'Separation' },
  { color: '#ff6644', shape: 'circle', label: '重逢点', labelEN: 'Reunion' },
];

// ── Styles ──────────────────────────────────────────────────────────

const S = {
  wrapper: {
    position: 'fixed',
    right: 20,
    bottom: 120,
    zIndex: 50,
    pointerEvents: 'auto',
    userSelect: 'none',
  } satisfies CSSProperties,

  container: {
    background: 'rgba(10, 10, 30, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '10px 14px',
    minWidth: 180,
    transition: 'opacity 300ms ease, transform 300ms ease',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    marginBottom: 0,
  } satisfies CSSProperties,

  title: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase' as const,
  } satisfies CSSProperties,

  toggle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    background: 'none',
    borderWidth: 0,
    borderStyle: 'none' as const,
    borderColor: 'transparent',
    cursor: 'pointer',
    padding: '2px 4px',
    transition: 'color 200ms ease',
  } satisfies CSSProperties,

  section: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: 'solid' as const,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  } satisfies CSSProperties,

  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  } satisfies CSSProperties,

  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '2px 0',
  } satisfies CSSProperties,

  label: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 1.3,
    flex: 1,
  } satisfies CSSProperties,

  labelSub: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.35)',
  } satisfies CSSProperties,
};

// ── Shape renderers ─────────────────────────────────────────────────

function ShapeIcon({ color, shape }: { color: string; shape: string }) {
  const size = 14;
  const half = size / 2;

  if (shape === 'line') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <line x1={1} y1={half} x2={size - 1} y2={half}
          stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    );
  }

  if (shape === 'circle') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={4}
          fill={color} opacity={0.9} />
      </svg>
    );
  }

  if (shape === 'diamond') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon points={`${half},1 ${size - 2},${half} ${half},${size - 1} 2,${half}`}
          fill={color} opacity={0.9} />
      </svg>
    );
  }

  if (shape === 'ring') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={4}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
      </svg>
    );
  }

  return null;
}

// ── Component ───────────────────────────────────────────────────────

export function Legend() {
  const [collapsed, setCollapsed] = useState(false);

  const sections: { label: string; entries: LegendEntry[] }[] = [
    { label: '航线 Trajectory', entries: TRAJECTORY_ENTRIES },
    { label: '恒星 Stars', entries: STAR_ENTRIES },
    { label: '目标 Objects', entries: OBJECT_ENTRIES },
    { label: '标记 Markers', entries: MARKER_ENTRIES },
  ];

  return (
    <div style={S.wrapper}>
      <div style={{
        ...S.container,
        ...(collapsed ? { padding: '8px 14px' } : {}),
      }}>
        <div
          style={{ ...S.header, marginBottom: collapsed ? 0 : 4 }}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span style={S.title}>图例 Legend</span>
          <button
            style={S.toggle}
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
          >
            {collapsed ? '▸ 展开' : '▾ 收起'}
          </button>
        </div>

        {!collapsed && sections.map((section, si) => (
          <div key={section.label} style={si === 0 ? { marginTop: 4 } : S.section}>
            <div style={S.sectionLabel}>{section.label}</div>
            {section.entries.map((entry) => (
              <div key={entry.label} style={S.row}>
                <ShapeIcon color={entry.color} shape={entry.shape} />
                <div style={S.label}>
                  {entry.label}
                  <br />
                  <span style={S.labelSub}>{entry.labelEN}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
