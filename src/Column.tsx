import { Plus, Trash2, X } from 'lucide-react'
import { Fragment, useRef, type PointerEvent, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MAX_TEXT, type Card, type ColumnId, type Direction } from './board'
import { CardItem } from './CardItem'

const ACCENT: Record<ColumnId, string> = {
  todo: 'bg-sky-500',
  doing: 'bg-amber-500',
  done: 'bg-emerald-500',
}

interface ColumnProps {
  id: ColumnId
  title: string
  /** The cards to show (already filtered), top to bottom. */
  cards: Card[]
  /** How many cards the column holds with no filter applied. */
  total: number
  filtering: boolean
  /** While a card is dragged: it's hidden here, and a gap opens in front of `dropBefore` (null = at the end). */
  dragging: { id: string; height: number; dropBefore: string | null | undefined } | null
  editingId: string | null
  adding: boolean
  onAddingChange: (adding: boolean) => void
  onAdd: (text: string) => void
  onClear: () => void
  onStartEdit: (id: string) => void
  onEndEdit: (id: string, text: string | null, byKeyboard: boolean) => void
  onDelete: (id: string) => void
  onMove: (id: string, to: ColumnId) => void
  onNudge: (id: string, direction: Direction) => void
  onCardPointerDown: (event: PointerEvent<HTMLElement>, card: Card) => void
}

export function Column(props: ColumnProps) {
  const { id, title, cards, total, filtering, dragging, editingId } = props
  const shown = dragging ? cards.filter((card) => card.id !== dragging.id) : cards
  const gap = dragging?.dropBefore
  const gapElement = dragging && (
    <li aria-hidden className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5" style={{ height: dragging.height }} />
  )

  let empty: ReactNode = null
  if (shown.length === 0 && gap === undefined) {
    empty = (
      <li className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-foreground/10 px-3 text-center text-xs text-muted-foreground">
        {filtering && total > 0 ? 'No matching cards' : 'No cards yet'}
      </li>
    )
  }

  return (
    <section
      data-drop-column={id}
      aria-labelledby={`column-${id}`}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-xl bg-muted/60 p-2 ring-1 ring-foreground/5 transition-colors dark:bg-muted/30',
        gap !== undefined && 'bg-primary/5 ring-primary/25 dark:bg-primary/10',
      )}
    >
      <header className="flex h-8 items-center gap-2 px-1.5">
        <span aria-hidden className={cn('size-2 rounded-full', ACCENT[id])} />
        <h2 id={`column-${id}`} className="text-sm font-semibold">
          {title}
        </h2>
        <Badge variant="secondary" className="tabular-nums" aria-label={filtering ? `${cards.length} of ${total} cards` : `${total} cards`}>
          {filtering ? `${cards.length}/${total}` : total}
        </Badge>
        {id === 'done' && total > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label={`Clear ${title}`} className="ml-auto text-muted-foreground" onClick={props.onClear} />
              }
            >
              <Trash2 />
            </TooltipTrigger>
            <TooltipContent>Clear {title}</TooltipContent>
          </Tooltip>
        )}
      </header>

      <ul aria-labelledby={`column-${id}`} className="flex flex-col gap-2">
        {shown.map((card) => (
          <Fragment key={card.id}>
            {gap === card.id && gapElement}
            <CardItem
              card={card}
              editing={editingId === card.id}
              onStartEdit={() => props.onStartEdit(card.id)}
              onEndEdit={(text, byKeyboard) => props.onEndEdit(card.id, text, byKeyboard)}
              onDelete={() => props.onDelete(card.id)}
              onMove={(to) => props.onMove(card.id, to)}
              onNudge={(direction) => props.onNudge(card.id, direction)}
              onPointerDown={(event) => props.onCardPointerDown(event, card)}
            />
          </Fragment>
        ))}
        {gap === null && gapElement}
        {empty}
      </ul>

      {props.adding ? (
        <AddCardForm title={title} onAdd={props.onAdd} onClose={() => props.onAddingChange(false)} />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          aria-label={`Add a card to ${title}`}
          onClick={() => props.onAddingChange(true)}
        >
          <Plus />
          Add card
        </Button>
      )}
    </section>
  )
}

/** Enter adds and stays open for the next card; Escape, or leaving it empty, closes it. */
function AddCardForm({ title, onAdd, onClose }: { title: string; onAdd: (text: string) => void; onClose: () => void }) {
  const input = useRef<HTMLTextAreaElement>(null)
  const submit = () => {
    const field = input.current!
    if (field.value.trim() === '') return field.focus()
    onAdd(field.value)
    field.value = ''
    field.focus()
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      onBlur={(event) => {
        const leaving = !event.currentTarget.contains(event.relatedTarget as Node | null)
        if (leaving && input.current?.value.trim() === '') onClose()
      }}
    >
      <Textarea
        ref={input}
        aria-label={`New card in ${title}`}
        placeholder="What needs doing?"
        maxLength={MAX_TEXT}
        autoFocus
        className="min-h-16 resize-none bg-card dark:bg-card"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
      />
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm">
          Add card
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel adding" onClick={onClose}>
          <X />
        </Button>
      </div>
    </form>
  )
}
