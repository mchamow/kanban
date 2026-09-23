import { Search, Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { cardsIn, COLUMNS, matches, type ColumnId } from './board'
import { boardReducer } from './boardReducer'
import { CARD_HINT_ID } from './CardItem'
import { Column } from './Column'
import { findCard, focusCard, neighbourCard } from './focus'
import { loadBoard, saveBoard } from './storage'
import { useCardDrag } from './useCardDrag'

/** How long the status toast stays up; longer while it still offers Undo. */
const STATUS_MS = 4000
const UNDO_MS = 8000

const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.isContentEditable === true
}

export default function App() {
  const [{ board, status }, dispatch] = useReducer(boardReducer, undefined, () => ({ board: loadBoard(), status: null }))
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState<ColumnId | null>(null)
  const search = useRef<HTMLInputElement>(null)
  /** A card to focus once the next render is on screen (after a keyboard move, an edit, a delete). */
  const focusNext = useRef<string | null>(null)

  useEffect(() => saveBoard(board), [board])

  useLayoutEffect(() => {
    if (focusNext.current !== null && focusCard(focusNext.current)) focusNext.current = null
  })

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => dispatch({ type: 'dismiss' }), status.undo ? UNDO_MS : STATUS_MS)
    return () => clearTimeout(timer)
  }, [status])

  const { drag, begin } = useCardDrag(
    useCallback((id, { column, before }) => dispatch({ type: 'move', id, to: column, before }), []),
  )

  const deleteCard = useCallback((id: string) => {
    // Keep the keyboard where it was: on the next card down, else the one above.
    const card = findCard(id)
    const neighbour = card && (neighbourCard(card, 'down') ?? neighbourCard(card, 'up'))
    focusNext.current = neighbour?.dataset.cardId ?? null
    dispatch({ type: 'delete', id })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const mod = event.metaKey || event.ctrlKey
      if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
        if (!status?.undo) return
        event.preventDefault()
        dispatch({ type: 'undo' })
        return
      }
      if (mod || event.altKey) return
      if (event.key === '/') {
        event.preventDefault()
        search.current?.focus()
      } else if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        setAdding('todo')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [status])

  const filtering = query.trim() !== ''
  const total = board.cards.length

  return (
    <div className={cn('min-h-dvh bg-background text-foreground', drag && 'cursor-grabbing select-none')}>
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-3xl leading-none sm:text-4xl">
              📋
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Kanban Board</h1>
              <p className="text-sm text-muted-foreground">
                {total === 0 ? 'An empty board — add a card to start.' : `${total} ${total === 1 ? 'card' : 'cards'}, saved in this browser.`}
              </p>
            </div>
          </div>
          <div className="relative sm:ml-auto sm:w-72">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={search}
              type="search"
              aria-label="Filter cards"
              placeholder="Filter cards"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setQuery('')
                  event.currentTarget.blur()
                }
              }}
              className="pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear filter"
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                onClick={() => {
                  setQuery('')
                  search.current?.focus()
                }}
              >
                <X />
              </Button>
            ) : (
              <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
            )}
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              cards={cardsIn(board, column.id, (card) => matches(card, query))}
              total={cardsIn(board, column.id).length}
              filtering={filtering}
              dragging={
                drag && {
                  id: drag.id,
                  height: drag.height,
                  dropBefore: drag.over.column === column.id ? drag.over.before : undefined,
                }
              }
              editingId={editingId}
              adding={adding === column.id}
              onAddingChange={(open) => setAdding(open ? column.id : null)}
              onAdd={(text) => dispatch({ type: 'add', column: column.id, text })}
              onClear={() => dispatch({ type: 'clear', column: column.id })}
              onStartEdit={setEditingId}
              onEndEdit={(id, text, byKeyboard) => {
                if (text !== null) dispatch({ type: 'edit', id, text })
                setEditingId(null)
                if (byKeyboard) focusNext.current = id
              }}
              onDelete={deleteCard}
              onMove={(id, to) => {
                focusNext.current = id
                dispatch({ type: 'move', id, to, before: null })
              }}
              onNudge={(id, direction) => {
                focusNext.current = id
                dispatch({ type: 'nudge', id, direction, query })
              }}
              onCardPointerDown={(event, card) => begin(event, card.id, card.text)}
            />
          ))}
        </div>

        <footer className="hidden flex-wrap items-center gap-x-4 sm:flex gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Kbd>/</Kbd> filter
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>N</Kbd> new card
          </span>
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd>Shift</Kbd>+<Kbd>←↑↓→</Kbd>
            </KbdGroup>
            move the focused card
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> edit
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Del</Kbd> delete
          </span>
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd>{MOD_KEY}</Kbd>
              <Kbd>Z</Kbd>
            </KbdGroup>
            undo a delete
          </span>
        </footer>
        <p id={CARD_HINT_ID} hidden>
          Shift plus arrow keys move the card, Enter edits it, Delete removes it.
        </p>
      </main>

      {drag && (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-50 flex items-start gap-1 rounded-lg bg-card py-2 pr-8 pl-1 text-sm shadow-xl ring-2 ring-primary/40"
          style={{ width: drag.width, transform: `translate(${drag.left}px, ${drag.top}px) rotate(2deg)` }}
        >
          <span className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 py-px leading-snug break-words whitespace-pre-wrap">{drag.text}</p>
        </div>
      )}

      <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        {status && (
          <div
            key={status.key}
            className="pointer-events-auto flex max-w-full animate-in items-center gap-2 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm text-background shadow-lg fade-in-0 slide-in-from-bottom-2"
          >
            <span className="truncate">{status.message}</span>
            {status.undo && (
              <Button size="xs" variant="secondary" className="rounded-full" onClick={() => dispatch({ type: 'undo' })}>
                <Undo2 />
                Undo
              </Button>
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Dismiss"
              className="rounded-full text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
              onClick={() => dispatch({ type: 'dismiss' })}
            >
              <X />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
