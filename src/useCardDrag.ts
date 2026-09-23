import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dropBefore, isColumnId, type ColumnId } from './board'

export interface DropTarget {
  column: ColumnId
  before: string | null
}

export interface Drag {
  id: string
  text: string
  width: number
  height: number
  /** Where the floating copy's top-left corner goes. */
  left: number
  top: number
  over: DropTarget
}

interface Pending {
  id: string
  text: string
  pointerId: number
  startX: number
  startY: number
  rect: DOMRect
}

/** How far the pointer travels before a press becomes a drag, so a click stays a click. */
const THRESHOLD = 5
/** Within this many pixels of the top or bottom of the window, the page scrolls along. */
const EDGE = 56
const SCROLL_STEP = 14

/**
 * Where a card dropped at (x, y) would land: the column under the pointer (or the nearest one,
 * so dropping in a gap still works), in front of the first card whose middle is below it.
 * Columns mark themselves with `data-drop-column`, cards with `data-card-id`.
 */
export function hitTest(x: number, y: number, draggedId: string): DropTarget | null {
  let nearest: { element: HTMLElement; distance: number } | null = null
  for (const element of document.querySelectorAll<HTMLElement>('[data-drop-column]')) {
    const rect = element.getBoundingClientRect()
    const dx = Math.max(rect.left - x, 0, x - rect.right)
    const dy = Math.max(rect.top - y, 0, y - rect.bottom)
    const distance = Math.hypot(dx, dy)
    if (!nearest || distance < nearest.distance) nearest = { element, distance }
  }
  const column = nearest?.element.dataset.dropColumn
  if (!nearest || !isColumnId(column)) return null

  const targets = [...nearest.element.querySelectorAll<HTMLElement>('[data-card-id]')]
    .filter((card) => card.dataset.cardId !== draggedId)
    .map((card) => {
      const rect = card.getBoundingClientRect()
      return { id: card.dataset.cardId!, mid: rect.top + rect.height / 2 }
    })
  return { column, before: dropBefore(targets, y) }
}

/**
 * Pointer-event drag and drop: works the same for mouse, pen and touch. A mouse can grab a
 * card anywhere; touch and pen grab it by its handle (`data-drag-handle`), so swiping over a
 * card still scrolls the page. Escape or a cancelled pointer drops nothing.
 */
export function useCardDrag(onDrop: (id: string, target: DropTarget) => void) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const pending = useRef<Pending | null>(null)
  const current = useRef<Drag | null>(null)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })

  const begin = useCallback((event: ReactPointerEvent<HTMLElement>, id: string, text: string) => {
    if (event.button !== 0 || !event.isPrimary || pending.current) return
    const target = event.target as HTMLElement
    const fromHandle = target.closest('[data-drag-handle]') !== null
    const fromControl = target.closest('button, a, input, textarea, [role="menuitem"]') !== null
    if (!fromHandle && (event.pointerType !== 'mouse' || fromControl)) return
    pending.current = {
      id,
      text,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
    }
  }, [])

  useEffect(() => {
    let pointer = { x: 0, y: 0 }
    let frame = 0

    const show = (next: Drag | null) => {
      current.current = next
      setDrag(next)
    }

    const follow = () => {
      const p = pending.current
      const d = current.current
      if (!p || !d) return
      show({
        ...d,
        left: pointer.x - (p.startX - p.rect.left),
        top: pointer.y - (p.startY - p.rect.top),
        over: hitTest(pointer.x, pointer.y, p.id) ?? d.over,
      })
    }

    const autoScroll = () => {
      frame = requestAnimationFrame(autoScroll)
      const step = pointer.y < EDGE ? -SCROLL_STEP : pointer.y > window.innerHeight - EDGE ? SCROLL_STEP : 0
      if (step === 0) return
      const before = window.scrollY
      window.scrollBy(0, step)
      if (window.scrollY !== before) follow()
    }

    const stop = () => {
      cancelAnimationFrame(frame)
      pending.current = null
      if (current.current) show(null)
    }

    const onMove = (event: PointerEvent) => {
      const p = pending.current
      if (!p || event.pointerId !== p.pointerId) return
      pointer = { x: event.clientX, y: event.clientY }
      if (!current.current) {
        if (Math.hypot(pointer.x - p.startX, pointer.y - p.startY) < THRESHOLD) return
        const over = hitTest(pointer.x, pointer.y, p.id)
        if (!over) return stop()
        current.current = { id: p.id, text: p.text, width: p.rect.width, height: p.rect.height, left: 0, top: 0, over }
        frame = requestAnimationFrame(autoScroll)
      }
      event.preventDefault()
      follow()
    }

    const onUp = (event: PointerEvent) => {
      const p = pending.current
      if (!p || event.pointerId !== p.pointerId) return
      const d = current.current
      stop()
      if (d) onDropRef.current(d.id, d.over)
    }

    const onCancel = (event: PointerEvent) => {
      if (pending.current?.pointerId === event.pointerId) stop()
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !pending.current) return
      if (current.current) {
        // This Escape was for the drag; the rest of the page shouldn't also act on it.
        event.preventDefault()
        event.stopPropagation()
      }
      stop()
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [])

  return { drag, begin }
}
