import { ArrowDown, ArrowUp, GripVertical, MoreHorizontal, MoveRight, Pencil, Trash2 } from 'lucide-react'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { COLUMNS, MAX_TEXT, type Card, type ColumnId, type Direction } from './board'
import { neighbourCard } from './focus'

export const CARD_HINT_ID = 'card-keyboard-hint'

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

interface CardItemProps {
  card: Card
  editing: boolean
  onStartEdit: () => void
  /** The new text, or null when the edit was cancelled; `byKeyboard` is false when focus went elsewhere. */
  onEndEdit: (text: string | null, byKeyboard: boolean) => void
  onDelete: () => void
  onMove: (to: ColumnId) => void
  onNudge: (direction: Direction) => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
}

export function CardItem({ card, editing, onStartEdit, onEndEdit, onDelete, onMove, onNudge, onPointerDown }: CardItemProps) {
  const done = card.column === 'done'
  const itemRef = useRef<HTMLLIElement>(null)

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    // Keys typed inside the card's menu button or editor belong to them.
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
    const direction = ARROWS[event.key]
    if (direction) {
      event.preventDefault()
      if (event.shiftKey) onNudge(direction)
      else neighbourCard(event.currentTarget, direction)?.focus()
    } else if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      onStartEdit()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete()
    }
  }

  if (editing) return <CardEditor card={card} onEnd={onEndEdit} />

  return (
    <li
      ref={itemRef}
      data-card-id={card.id}
      tabIndex={0}
      aria-label={card.text}
      aria-describedby={CARD_HINT_ID}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        if (!(event.target as HTMLElement).closest('button')) onStartEdit()
      }}
      className={cn(
        'group/card relative flex cursor-grab items-start gap-1 rounded-lg bg-card py-2 pr-1 pl-1 text-sm shadow-xs ring-1 ring-foreground/10 transition-shadow outline-none select-none',
        'hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span
        data-drag-handle
        aria-hidden
        className="flex h-5 w-5 shrink-0 touch-none items-center justify-center text-muted-foreground/50 group-hover/card:text-muted-foreground"
      >
        <GripVertical className="size-4" />
      </span>
      <p
        className={cn(
          'min-w-0 flex-1 py-px leading-snug break-words whitespace-pre-wrap',
          done && 'text-muted-foreground line-through decoration-muted-foreground/40',
        )}
      >
        {card.text}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for “${card.text}”`}
              className="-my-0.5 text-muted-foreground sm:opacity-0 sm:group-hover/card:opacity-100 sm:group-focus-within/card:opacity-100 sm:data-popup-open:opacity-100"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44"
          // Back to the card when the menu closes — unless an action replaced it (edit, delete, a
          // move to another column), in which case the board decides where focus goes.
          finalFocus={() => (itemRef.current?.isConnected ? itemRef.current : false)}
        >
          <DropdownMenuItem onClick={onStartEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNudge('up')}>
            <ArrowUp />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNudge('down')}>
            <ArrowDown />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {COLUMNS.filter((column) => column.id !== card.column).map((column) => (
              <DropdownMenuItem key={column.id} onClick={() => onMove(column.id)}>
                <MoveRight />
                {column.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/** Enter saves, Shift+Enter breaks the line, Escape cancels, clicking away saves. */
function CardEditor({ card, onEnd }: { card: Card; onEnd: (text: string | null, byKeyboard: boolean) => void }) {
  // Only the first way out counts: a blur that follows Escape must not save the text after all.
  const ended = useRef(false)
  const end = (text: string | null, byKeyboard = true) => {
    if (ended.current) return
    ended.current = true
    onEnd(text, byKeyboard)
  }

  return (
    <li data-card-id={card.id} className="rounded-lg bg-card p-1.5 shadow-xs ring-2 ring-ring/60">
      <Textarea
        aria-label="Card text"
        defaultValue={card.text}
        maxLength={MAX_TEXT}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => end(event.currentTarget.value, false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            end(event.currentTarget.value)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            end(null)
          }
        }}
        className="min-h-16 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </li>
  )
}
