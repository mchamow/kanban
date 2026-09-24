/**
 * Card backgrounds: one per hue around the wheel, each the lightest shade that still gives
 * white text a 4.5:1 contrast (WCAG AA). Any lighter and the white text stops being readable.
 */
export const CARD_COLORS = [
  '#c54864', // rose
  '#c44f21', // orange
  '#a26708', // amber
  '#548108', // lime
  '#0d8557', // green
  '#00837e', // teal
  '#017e9a', // cyan
  '#0a77cb', // blue
  '#6868d2', // indigo
  '#975ac0', // violet
  '#b54d98', // pink
] as const

/**
 * A random-looking colour that's really a hash of the card's id: stable across reloads and
 * moves, with nothing extra to save.
 */
export function cardColor(id: string) {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return CARD_COLORS[(hash >>> 0) % CARD_COLORS.length]
}
