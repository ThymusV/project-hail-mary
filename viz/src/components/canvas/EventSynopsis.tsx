/**
 * EventSynopsis -- floating card showing the nearest story event.
 *
 * Reads storyProgress, finds the closest importance 1-2 event via
 * useTimelineData, and renders a glassmorphism Html overlay at the
 * event's 3D position with smooth fade transitions.
 */

import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useTimelineData, type TimelineEvent } from '@/hooks/useTimelineData';

// ── Styles ──────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  pointerEvents: 'none',
  width: 220,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(12, 14, 22, 0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(120, 140, 200, 0.2)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  transition: 'opacity 0.45s ease',
  fontFamily:
    '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
};

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#e8eaf0',
  marginBottom: 4,
  lineHeight: 1.3,
};

const descStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#9ba4b8',
  lineHeight: 1.45,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const chapterStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#6b7394',
  marginTop: 6,
  letterSpacing: 0.5,
};

// ── Component ───────────────────────────────────────────────────────────

export function EventSynopsis() {
  const timeline = useTimelineData();
  const [currentEvent, setCurrentEvent] = useState<TimelineEvent | null>(null);
  const [opacity, setOpacity] = useState(0);
  const prevEventId = useRef<string | null>(null);
  const posRef = useRef<[number, number, number]>([0, 0, 0]);

  // Check for nearest event each frame
  useFrame(() => {
    const progress = useTimelineStore.getState().storyProgress;
    const event = timeline.nearestEvent(progress);

    // Only show importance 1 and 2
    const showable = event && (event.importance === 1 || event.importance === 2)
      ? event
      : null;

    if (showable?.id !== prevEventId.current) {
      prevEventId.current = showable?.id ?? null;
      setCurrentEvent(showable);
    }
  });

  // Smooth fade in/out when event changes
  useEffect(() => {
    if (currentEvent) {
      // Offset position: slightly above and to the right
      posRef.current = [
        currentEvent.position[0] + 0.5,
        currentEvent.position[1] + 0.8,
        currentEvent.position[2] + 0.3,
      ];
      // Fade in after a micro-delay to allow DOM update
      const raf = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(raf);
    } else {
      setOpacity(0);
    }
  }, [currentEvent]);

  if (!currentEvent) return null;

  return (
    <Html
      position={posRef.current}
      distanceFactor={8}
      center
      style={{
        ...cardStyle,
        opacity,
      }}
      // Keep it from occluding interactions
      zIndexRange={[0, 0]}
    >
      <div style={labelStyle}>{currentEvent.label}</div>
      <div style={descStyle}>{currentEvent.description}</div>
      <div style={chapterStyle}>
        {'第 ' + currentEvent.chapter + ' 章'}
      </div>
    </Html>
  );
}
