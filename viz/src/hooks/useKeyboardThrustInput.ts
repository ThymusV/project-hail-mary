/**
 * useKeyboardThrustInput — tracks WASD+extras key state into a mutable
 * ThrustInput ref, updated by keydown/keyup listeners.
 *
 * Deliberately NOT React state: physics runs inside useFrame at render
 * frame rate, and going through setState (+ re-render) every frame for
 * input would be wasteful. The ref is read directly inside useFrame by
 * the scene that owns the flight physics.
 *
 * Control scheme (documented here as the single source of truth — the
 * on-screen help hint in LocalSpaceScene mirrors this):
 *   W/S       — main drive forward/backward
 *   Q/E       — RCS strafe left/right
 *   Space     — RCS ascend
 *   Shift     — RCS descend
 *   A/D       — yaw left/right
 *   ArrowUp/Down — pitch up/down
 */

import { useEffect, useRef } from 'react';
import { NO_INPUT, type ThrustInput } from '@/engine/localFlight';

const KEY_MAP: Record<string, keyof ThrustInput> = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyQ: 'strafeLeft',
  KeyE: 'strafeRight',
  Space: 'ascend',
  ShiftLeft: 'descend',
  ShiftRight: 'descend',
  KeyA: 'yawLeft',
  KeyD: 'yawRight',
  ArrowUp: 'pitchUp',
  ArrowDown: 'pitchDown',
};

export function useKeyboardThrustInput() {
  const inputRef = useRef<ThrustInput>({ ...NO_INPUT });

  useEffect(() => {
    function setKey(code: string, value: boolean) {
      const field = KEY_MAP[code];
      if (field) inputRef.current[field] = value;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (KEY_MAP[e.code]) e.preventDefault();
      setKey(e.code, true);
    }
    function handleKeyUp(e: KeyboardEvent) {
      setKey(e.code, false);
    }
    // Prevent a stuck key if focus is lost mid-press (alt-tab, etc.)
    function handleBlur() {
      inputRef.current = { ...NO_INPUT };
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return inputRef;
}
