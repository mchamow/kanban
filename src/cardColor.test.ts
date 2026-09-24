import { describe, expect, it } from 'vitest'
import { CARD_COLORS, cardColor } from './cardColor'

const luminance = (hex: string) => {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)!
    .map((pair) => {
      const c = parseInt(pair, 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('cardColor', () => {
  it('keeps white text readable on every colour (WCAG AA, 4.5:1)', () => {
    for (const color of CARD_COLORS) expect(1.05 / (luminance(color) + 0.05)).toBeGreaterThanOrEqual(4.5)
  })

  it('gives a card the same colour every time', () => {
    expect(cardColor('abc-123')).toBe(cardColor('abc-123'))
  })

  it('spreads cards across the palette', () => {
    const used = new Set(Array.from({ length: 200 }, (_, i) => cardColor(`card-${i}`)))
    expect(used.size).toBe(CARD_COLORS.length)
  })
})
