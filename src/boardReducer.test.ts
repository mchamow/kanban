import { describe, expect, it } from 'vitest'
import { cardsIn, type Board } from './board'
import { boardReducer, type Action, type State } from './boardReducer'

const start: State = {
  board: {
    cards: [
      { id: 'a', text: 'Alpha', column: 'todo' },
      { id: 'b', text: 'Beta', column: 'todo' },
      { id: 'c', text: 'Gamma', column: 'done' },
    ],
  },
  status: null,
}

const run = (...actions: Action[]) => actions.reduce(boardReducer, start)
const ids = (board: Board, column: 'todo' | 'doing' | 'done') => cardsIn(board, column).map((c) => c.id)

describe('boardReducer', () => {
  it('adds and announces', () => {
    const state = run({ type: 'add', column: 'doing', text: 'New', id: 'n' })
    expect(ids(state.board, 'doing')).toEqual(['n'])
    expect(state.status?.message).toBe('Added a card to Doing.')
  })

  it('ignores a blank add or an unchanged edit', () => {
    expect(run({ type: 'add', column: 'todo', text: ' ' })).toBe(start)
    expect(run({ type: 'edit', id: 'a', text: 'Alpha' })).toBe(start)
  })

  it('announces moves between and within columns', () => {
    expect(run({ type: 'move', id: 'a', to: 'doing', before: null }).status?.message).toBe('Moved “Alpha” to Doing.')
    expect(run({ type: 'nudge', id: 'b', direction: 'up', query: '' }).status?.message).toBe(
      'Moved “Beta” to position 1 of 2 in To do.',
    )
  })

  it('does nothing for a move that goes nowhere', () => {
    expect(run({ type: 'move', id: 'b', to: 'todo', before: null })).toBe(start)
    expect(run({ type: 'nudge', id: 'c', direction: 'right', query: '' })).toBe(start)
  })

  it('nudges past cards the filter hides', () => {
    const state = run(
      { type: 'add', column: 'todo', text: 'Alpha two', id: 'a2' },
      { type: 'nudge', id: 'a2', direction: 'up', query: 'alpha' },
    )
    expect(ids(state.board, 'todo')).toEqual(['a2', 'a', 'b'])
  })

  it('undoes a delete', () => {
    const deleted = run({ type: 'delete', id: 'b' })
    expect(deleted.status?.message).toBe('Deleted “Beta”.')
    expect(ids(deleted.board, 'todo')).toEqual(['a'])
    const restored = boardReducer(deleted, { type: 'undo' })
    expect(restored.board).toBe(start.board)
    expect(restored.status?.undo).toBeNull()
  })

  it('undoes clearing a column', () => {
    const cleared = run({ type: 'clear', column: 'done' })
    expect(cleared.status?.message).toBe('Cleared 1 card from Done.')
    expect(boardReducer(cleared, { type: 'undo' }).board).toBe(start.board)
    expect(run({ type: 'clear', column: 'doing' })).toBe(start)
  })

  it('forgets the undo once something else changes', () => {
    const state = run({ type: 'delete', id: 'b' }, { type: 'edit', id: 'a', text: 'Changed' })
    expect(state.status).toBeNull()
    expect(boardReducer(state, { type: 'undo' })).toBe(state)
  })

  it('shortens long card text in messages and bumps the key', () => {
    const long = 'x'.repeat(60)
    const state = run({ type: 'add', column: 'todo', text: long, id: 'l' }, { type: 'delete', id: 'l' })
    expect(state.status?.message).toBe(`Deleted “${'x'.repeat(39)}…”.`)
    expect(state.status?.key).toBe(2)
    expect(boardReducer(state, { type: 'dismiss' }).status).toBeNull()
  })
})
