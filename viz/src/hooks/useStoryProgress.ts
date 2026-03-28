/**
 * Timeline playback hook.
 *
 * Advances storyProgress in the animation loop when isPlaying is true.
 * BASE_RATE is tuned so 1x speed traverses 0-1 in ~60 seconds.
 */

import { useFrame } from '@react-three/fiber';
import { useTimelineStore } from '@/stores/useTimelineStore';

/** At 1x speed the full 0-1 range plays out in ~60 seconds. */
const BASE_RATE = 1 / 60;

export function useStoryProgress(): void {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const speed = useTimelineStore((s) => s.playbackSpeed);
  const setProgress = useTimelineStore((s) => s.setProgress);

  useFrame((_state, delta) => {
    if (!isPlaying) return;

    // Cap delta to prevent huge jumps after tab-switch or frame spike
    const dt = Math.min(delta, 0.1);

    const current = useTimelineStore.getState().storyProgress;
    const next = current + dt * speed * BASE_RATE;

    // Clamp and stop at end
    if (next >= 1) {
      setProgress(1);
      useTimelineStore.getState().pause();
      return;
    }

    setProgress(next);
  });
}
