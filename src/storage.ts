import { cleanText, isColumnId, WELCOME, type Board, type Card } from './board'

export const STORAGE_KEY = 'kanban:board'

function card(value: unknown, seen: Set<string>): Card | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, text, column } = value as Record<string, unknown>
  if (typeof id !== 'string' || id === '' || seen.has(id)) return null
  if (typeof text !== 'string' || !isColumnId(column)) return null
  const clean = cleanText(text)
  if (clean === '') return null
  seen.add(id)
  return { id, text: clean, column }
}

/**
 * First visit (nothing saved) gets the welcome cards; an unreadable save does too, rather than
 * a broken board. A readable save keeps every card that makes sense and drops the rest, so one
 * hand-edited entry doesn't cost the whole board. An empty saved board stays empty.
 */
export function loadBoard(storage: Pick<Storage, 'getItem'> = localStorage): Board {
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return WELCOME
  }
  const cards = (raw as { cards?: unknown } | null)?.cards
  if (!Array.isArray(cards)) return WELCOME

  const seen = new Set<string>()
  return { cards: cards.map((value) => card(value, seen)).filter((value) => value !== null) }
}

/** Storage can be unavailable (private mode, quota): then the board works, it just forgets. */
export function saveBoard(board: Board, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, cards: board.cards }))
  } catch {
    // Nothing to do.
  }
}
