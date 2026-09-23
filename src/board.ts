export const COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done', title: 'Done' },
] as const

export type ColumnId = (typeof COLUMNS)[number]['id']

export interface Card {
  id: string
  text: string
  column: ColumnId
}

/**
 * One flat list: a card's column is a field, and its place in that column is its place in
 * the list relative to the other cards of the same column. Moves are "put it before that
 * card" rather than an index, so they stay correct while a filter hides some cards.
 */
export interface Board {
  cards: Card[]
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export const MAX_TEXT = 500

export const isColumnId = (value: unknown): value is ColumnId =>
  COLUMNS.some((column) => column.id === value)

export const columnTitle = (id: ColumnId) => COLUMNS.find((column) => column.id === id)!.title

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const cleanText = (text: string) => text.trim().slice(0, MAX_TEXT)

export function cardsIn(board: Board, column: ColumnId, visible: (card: Card) => boolean = () => true) {
  return board.cards.filter((card) => card.column === column && visible(card))
}

export function matches(card: Card, query: string) {
  const needle = query.trim().toLowerCase()
  return needle === '' || card.text.toLowerCase().includes(needle)
}

export function addCard(board: Board, column: ColumnId, text: string, id = newId()): Board {
  const clean = cleanText(text)
  if (clean === '') return board
  return { cards: [...board.cards, { id, text: clean, column }] }
}

/** An emptied-out edit keeps the old text: deleting is its own, deliberate action. */
export function editCard(board: Board, id: string, text: string): Board {
  const clean = cleanText(text)
  const card = board.cards.find((c) => c.id === id)
  if (clean === '' || !card || card.text === clean) return board
  return { cards: board.cards.map((c) => (c === card ? { ...c, text: clean } : c)) }
}

export function deleteCard(board: Board, id: string): Board {
  return { cards: board.cards.filter((card) => card.id !== id) }
}

export function clearColumn(board: Board, column: ColumnId): Board {
  return { cards: board.cards.filter((card) => card.column !== column) }
}

/** Moves a card into `to`, just before the card `before`, or to the end of the column when `before` is null. */
export function moveCard(board: Board, id: string, to: ColumnId, before: string | null): Board {
  const card = board.cards.find((c) => c.id === id)
  if (!card || before === id) return board
  const rest = board.cards.filter((c) => c.id !== id)
  const moved = { ...card, column: to }

  const anchor = before === null ? -1 : rest.findIndex((c) => c.id === before && c.column === to)
  // No anchor: right after the column's current last card (or the very end, for an empty column).
  rest.splice(anchor >= 0 ? anchor : rest.findLastIndex((c) => c.column === to) + 1 || rest.length, 0, moved)
  // Dropped back where it was: hand back the same board so callers can tell nothing moved.
  const unchanged = card.column === to && rest.every((c, i) => c.id === board.cards[i].id)
  return unchanged ? board : { cards: rest }
}

/**
 * The keyboard move: up/down swap with the neighbouring *visible* card, left/right carry the
 * card to the end of the next column. Returns the same board when there's nowhere to go.
 */
export function nudge(board: Board, id: string, direction: Direction, visible: (card: Card) => boolean = () => true): Board {
  const card = board.cards.find((c) => c.id === id)
  if (!card) return board

  if (direction === 'left' || direction === 'right') {
    const index = COLUMNS.findIndex((column) => column.id === card.column) + (direction === 'left' ? -1 : 1)
    const target = COLUMNS[index]
    return target ? moveCard(board, id, target.id, null) : board
  }

  const shown = cardsIn(board, card.column, (c) => c.id === id || visible(c))
  const index = shown.findIndex((c) => c.id === id)
  if (direction === 'up') {
    return index > 0 ? moveCard(board, id, card.column, shown[index - 1].id) : board
  }
  const next = shown[index + 1]
  if (!next) return board
  // After `next` means before whatever follows it in the whole column, hidden cards included.
  const all = cardsIn(board, card.column, (c) => c.id !== id)
  return moveCard(board, id, card.column, all[all.findIndex((c) => c.id === next.id) + 1]?.id ?? null)
}

/**
 * Which card a drop at `y` lands in front of, given the cards the pointer could land between
 * (top to bottom, the dragged card left out) and their vertical midpoints. Null means the end.
 */
export function dropBefore(targets: { id: string; mid: number }[], y: number): string | null {
  return targets.find((target) => y < target.mid)?.id ?? null
}

export const WELCOME: Board = {
  cards: [
    { id: 'welcome-1', column: 'todo', text: 'Drag me to Doing' },
    { id: 'welcome-2', column: 'todo', text: 'Double-click a card to edit it' },
    { id: 'welcome-3', column: 'todo', text: 'Press / to filter cards, N to add one' },
    { id: 'welcome-4', column: 'doing', text: 'Focus a card and press Shift + arrows to move it' },
    { id: 'welcome-5', column: 'done', text: 'Open the board' },
  ],
}
