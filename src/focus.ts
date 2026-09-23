import type { Direction } from './board'

const cardsOf = (column: Element) => [...column.querySelectorAll<HTMLElement>('[data-card-id]')]

export const findCard = (id: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-card-id]')].find((card) => card.dataset.cardId === id) ?? null

/**
 * Arrow-key focus between cards as they're shown on screen: up/down within a column,
 * left/right to the card at about the same height in the nearest column that has any.
 */
export function neighbourCard(from: HTMLElement, direction: Direction): HTMLElement | null {
  const column = from.closest('[data-drop-column]')
  if (!column) return null
  const cards = cardsOf(column)
  const index = cards.indexOf(from)
  if (direction === 'up') return cards[index - 1] ?? null
  if (direction === 'down') return cards[index + 1] ?? null

  const columns = [...document.querySelectorAll('[data-drop-column]')]
  const step = direction === 'left' ? -1 : 1
  for (let i = columns.indexOf(column) + step; i >= 0 && i < columns.length; i += step) {
    const others = cardsOf(columns[i])
    if (others.length > 0) return others[Math.min(index, others.length - 1)]
  }
  return null
}

export function focusCard(id: string) {
  const card = findCard(id)
  card?.focus()
  card?.scrollIntoView?.({ block: 'nearest' })
  return card !== null
}
