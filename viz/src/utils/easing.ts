/**
 * Pure easing functions — no GSAP dependency.
 * Naming mirrors GSAP conventions so data files can reference them by string.
 */

export function linear(t: number): number {
  return t;
}

export function easeInOutPower2(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInOutPower3(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Registry so callers can look up by GSAP-style name string. */
const EASING_MAP: Record<string, (t: number) => number> = {
  'linear': linear,
  'power2.inOut': easeInOutPower2,
  'power3.inOut': easeInOutPower3,
  'sine.inOut': easeInOutSine,
  'expo.out': easeOutExpo,
};

/**
 * Resolve a named easing and apply it.
 * Falls back to linear for unknown names.
 */
export function applyEasing(t: number, name: string): number {
  const fn = EASING_MAP[name] ?? linear;
  return fn(t);
}
