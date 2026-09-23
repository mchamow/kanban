import {
  addCard,
  cardsIn,
  clearColumn,
  columnTitle,
  deleteCard,
  editCard,
  matches,
  moveCard,
  newId,
  nudge,
  type Board,
  type ColumnId,
  type Direction,
} from './board'

/** The last thing that happened, for the status line (and screen readers). */
export interface Status {
  message: string
  /** The board as it was before a delete or clear, while it can still be brought back. */
  undo: Board | null
  /** Bumped on every status, so the same message twice still gets announced twice. */
  key: number
}

export interface State {
  board: Board
  status: Status | null
}

export type Action =
  | { type: 'add'; column: ColumnId; text: string; id?: string }
  | { type: 'edit'; id: string; text: string }
  | { type: 'delete'; id: string }
  | { type: 'clear'; column: ColumnId }
  | { type: 'move'; id: string; to: ColumnId; before: string | null }
  | { type: 'nudge'; id: string; direction: Direction; query: string }
  | { type: 'undo' }
  | { type: 'dismiss' }

const quote = (text: string) => `“${text.length > 40 ? `${text.slice(0, 39)}…` : text}”`

function moved(state: State, next: Board, id: string): State {
  if (next === state.board) return state
  const before = state.board.cards.find((c) => c.id === id)!
  const after = next.cards.find((c) => c.id === id)!
  const column = cardsIn(next, after.column)
  const where =
    before.column === after.column
      ? `to position ${column.indexOf(after) + 1} of ${column.length} in ${columnTitle(after.column)}`
      : `to ${columnTitle(after.column)}`
  return status(next, `Moved ${quote(after.text)} ${where}.`, null, state)
}

function status(board: Board, message: string, undo: Board | null, state: State): State {
  return { board, status: { message, undo, key: (state.status?.key ?? 0) + 1 } }
}

export function boardReducer(state: State, action: Action): State {
  const { board } = state
  switch (action.type) {
    case 'add': {
      const next = addCard(board, action.column, action.text, action.id ?? newId())
      return next === board ? state : status(next, `Added a card to ${columnTitle(action.column)}.`, null, state)
    }
    case 'edit': {
      const next = editCard(board, action.id, action.text)
      // Clears any pending undo: restoring the old snapshot would quietly revert this edit too.
      return next === board ? state : { board: next, status: null }
    }
    case 'delete': {
      const card = board.cards.find((c) => c.id === action.id)
      if (!card) return state
      return status(deleteCard(board, action.id), `Deleted ${quote(card.text)}.`, board, state)
    }
    case 'clear': {
      const count = cardsIn(board, action.column).length
      if (count === 0) return state
      const noun = count === 1 ? 'card' : 'cards'
      return status(clearColumn(board, action.column), `Cleared ${count} ${noun} from ${columnTitle(action.column)}.`, board, state)
    }
    case 'move':
      return moved(state, moveCard(board, action.id, action.to, action.before), action.id)
    case 'nudge':
      return moved(state, nudge(board, action.id, action.direction, (card) => matches(card, action.query)), action.id)
    case 'undo':
      return state.status?.undo ? status(state.status.undo, 'Restored.', null, state) : state
    case 'dismiss':
      return state.status ? { ...state, status: null } : state
  }
}
