import { describe, expect, it } from 'vitest'
import {
  addCard,
  cardsIn,
  clearColumn,
  deleteCard,
  dropBefore,
  editCard,
  matches,
  MAX_TEXT,
  moveCard,
  nudge,
  type Board,
  type ColumnId,
} from './board'

const board = (layout: Partial<Record<ColumnId, string[]>>): Board => ({
  cards: Object.entries(layout).flatMap(([column, ids]) =>
    ids.map((id) => ({ id, text: `card ${id}`, column: column as ColumnId })),
  ),
})

const ids = (b: Board, column: ColumnId) => cardsIn(b, column).map((card) => card.id)

describe('addCard', () => {
  it('appends a trimmed card to the column', () => {
    const next = addCard(board({ todo: ['a'] }), 'todo', '  write tests  ', 'b')
    expect(ids(next, 'todo')).toEqual(['a', 'b'])
    expect(next.cards[1].text).toBe('write tests')
  })

  it('ignores blank text and caps long text', () => {
    const start = board({})
    expect(addCard(start, 'todo', '   ')).toBe(start)
    expect(addCard(start, 'todo', 'x'.repeat(MAX_TEXT + 20)).cards[0].text).toHaveLength(MAX_TEXT)
  })
})

describe('editCard', () => {
  it('changes the text', () => {
    expect(editCard(board({ todo: ['a'] }), 'a', 'new').cards[0].text).toBe('new')
  })

  it('keeps the old text when the edit is blank', () => {
    const start = board({ todo: ['a'] })
    expect(editCard(start, 'a', '  ')).toBe(start)
  })
})

describe('deleteCard / clearColumn', () => {
  it('removes one card, or every card in a column', () => {
    const start = board({ todo: ['a', 'b'], done: ['c', 'd'] })
    expect(ids(deleteCard(start, 'a'), 'todo')).toEqual(['b'])
    const cleared = clearColumn(start, 'done')
    expect(ids(cleared, 'done')).toEqual([])
    expect(ids(cleared, 'todo')).toEqual(['a', 'b'])
  })
})

describe('moveCard', () => {
  const start = board({ todo: ['a', 'b', 'c'], doing: ['x', 'y'] })

  it('moves into another column before a given card', () => {
    const next = moveCard(start, 'b', 'doing', 'y')
    expect(ids(next, 'todo')).toEqual(['a', 'c'])
    expect(ids(next, 'doing')).toEqual(['x', 'b', 'y'])
  })

  it('moves to the end of a column', () => {
    expect(ids(moveCard(start, 'a', 'doing', null), 'doing')).toEqual(['x', 'y', 'a'])
    expect(ids(moveCard(start, 'a', 'todo', null), 'todo')).toEqual(['b', 'c', 'a'])
  })

  it('reorders within a column', () => {
    expect(ids(moveCard(start, 'c', 'todo', 'a'), 'todo')).toEqual(['c', 'a', 'b'])
  })

  it('falls back to the end when the anchor is in another column', () => {
    expect(ids(moveCard(start, 'a', 'done', 'x'), 'done')).toEqual(['a'])
  })

  it('returns the same board when nothing moves', () => {
    expect(moveCard(start, 'b', 'todo', 'c')).toBe(start)
    expect(moveCard(start, 'b', 'todo', 'b')).toBe(start)
    expect(moveCard(start, 'c', 'todo', null)).toBe(start)
    expect(moveCard(start, 'nope', 'done', null)).toBe(start)
  })
})

describe('nudge', () => {
  const start = board({ todo: ['a', 'b', 'c', 'd'], doing: ['x'] })

  it('swaps with neighbours', () => {
    expect(ids(nudge(start, 'b', 'up'), 'todo')).toEqual(['b', 'a', 'c', 'd'])
    expect(ids(nudge(start, 'b', 'down'), 'todo')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('stays put at the edges', () => {
    expect(nudge(start, 'a', 'up')).toBe(start)
    expect(nudge(start, 'd', 'down')).toBe(start)
    expect(nudge(start, 'a', 'left')).toBe(start)
    expect(nudge(board({ done: ['z'] }), 'z', 'right')).toEqual(board({ done: ['z'] }))
  })

  it('carries a card to the end of the next column', () => {
    const next = nudge(start, 'a', 'right')
    expect(ids(next, 'doing')).toEqual(['x', 'a'])
    expect(ids(nudge(next, 'a', 'left'), 'todo')).toEqual(['b', 'c', 'd', 'a'])
  })

  it('skips cards a filter hides', () => {
    const hideB = (card: { id: string }) => card.id !== 'b'
    expect(ids(nudge(start, 'c', 'up', hideB), 'todo')).toEqual(['c', 'a', 'b', 'd'])
    expect(ids(nudge(start, 'a', 'down', hideB), 'todo')).toEqual(['b', 'c', 'a', 'd'])
    const hideD = (card: { id: string }) => card.id !== 'd'
    expect(nudge(start, 'c', 'down', hideD)).toBe(start)
  })
})

describe('matches', () => {
  it('is a case-insensitive substring match; blank matches everything', () => {
    const card = { id: 'a', text: 'Fix the Login bug', column: 'todo' as const }
    expect(matches(card, 'login')).toBe(true)
    expect(matches(card, '  ')).toBe(true)
    expect(matches(card, 'logout')).toBe(false)
  })
})

describe('dropBefore', () => {
  const targets = [
    { id: 'a', mid: 100 },
    { id: 'b', mid: 200 },
  ]
  it('lands in front of the first card whose middle is below the pointer', () => {
    expect(dropBefore(targets, 50)).toBe('a')
    expect(dropBefore(targets, 150)).toBe('b')
    expect(dropBefore(targets, 250)).toBeNull()
    expect(dropBefore([], 0)).toBeNull()
  })
})
