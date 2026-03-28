/**
 * Star color utilities.
 *
 * Maps effective temperature (Kelvin) or spectral type letter
 * to an approximate RGB hex color for rendering.
 */

// ── Spectral type palette ────────────────────────────────────────────

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',   // blue
  B: '#aabfff',   // blue-white
  A: '#cad7ff',   // white
  F: '#f8f7ff',   // yellow-white
  G: '#fff4ea',   // yellow         — Sun, Tau Ceti
  K: '#ffd2a1',   // orange         — 40 Eridani A
  M: '#ffcc6f',   // red-orange
};

/**
 * Return the hex color for a spectral type letter (O–M).
 * Accepts single-char ("G") or full classification ("G2V") — only
 * the first character is used.  Falls back to white on unknown input.
 */
export function spectralTypeToColor(type: string): string {
  const letter = type.charAt(0).toUpperCase();
  return SPECTRAL_COLORS[letter] ?? '#ffffff';
}

// ── Temperature-to-color ─────────────────────────────────────────────

/**
 * Temperature breakpoints (Kelvin) mapped to spectral colors.
 * We linearly interpolate between adjacent breakpoints so the
 * transition is smooth rather than stepped.
 *
 * Approximate boundaries follow the standard Harvard classification:
 *   M  ≤ 3,500 K
 *   K  3,500 – 5,200 K
 *   G  5,200 – 6,000 K
 *   F  6,000 – 7,500 K
 *   A  7,500 – 10,000 K
 *   B  10,000 – 30,000 K
 *   O  > 30,000 K
 */

interface TempStop {
  temp: number;
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    ((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b))
      .toString(16)
      .slice(1)
  );
}

const TEMP_STOPS: TempStop[] = (
  [
    [2400, '#ffcc6f'],  // M (coolest rendered)
    [3500, '#ffcc6f'],  // M upper boundary
    [5200, '#ffd2a1'],  // K → G boundary
    [5800, '#fff4ea'],  // mid-G (Sun)
    [6000, '#fff4ea'],  // G → F boundary
    [7500, '#f8f7ff'],  // F → A boundary
    [10000, '#cad7ff'], // A → B boundary
    [30000, '#aabfff'], // B → O boundary
    [50000, '#9bb0ff'], // deep O
  ] as const
).map(([temp, hex]) => {
  const [r, g, b] = hexToRgb(hex as string);
  return { temp: temp as number, r, g, b };
});

/**
 * Convert an effective temperature in Kelvin to an approximate
 * hex color string.  Linearly interpolates between the spectral
 * breakpoints listed above.
 */
export function temperatureToColor(tempKelvin: number): string {
  if (tempKelvin <= TEMP_STOPS[0].temp) {
    const s = TEMP_STOPS[0];
    return rgbToHex(s.r, s.g, s.b);
  }

  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const lo = TEMP_STOPS[i - 1];
    const hi = TEMP_STOPS[i];

    if (tempKelvin <= hi.temp) {
      const t = (tempKelvin - lo.temp) / (hi.temp - lo.temp);
      return rgbToHex(
        lo.r + (hi.r - lo.r) * t,
        lo.g + (hi.g - lo.g) * t,
        lo.b + (hi.b - lo.b) * t,
      );
    }
  }

  // Above highest stop — return hottest color
  const last = TEMP_STOPS[TEMP_STOPS.length - 1];
  return rgbToHex(last.r, last.g, last.b);
}
