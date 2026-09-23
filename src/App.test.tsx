import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { COLUMNS, WELCOME, type ColumnId } from './board'
import { STORAGE_KEY } from './storage'

/**
 * jsdom lays nothing out, so give the board a fake geometry: columns 300px apart, cards
 * stacked 50px apart from y = 100 in DOM order. Enough for the drag hit-testing to work.
 */
const COLUMN_X = 300
const cardTop = (index: number) => 100 + index * 50

function fakeRect(this: HTMLElement): DOMRect {
  const make = (x: number, y: number, width: number, height: number) =>
    ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect
  const columnIndex = (element: Element | null) =>
    COLUMNS.findIndex((c) => c.id === (element as HTMLElement | null)?.dataset.dropColumn)

  if (this.dataset.dropColumn) return make(columnIndex(this) * COLUMN_X, 0, 280, 1000)
  if (this.dataset.cardId) {
    const column = this.closest('[data-drop-column]')!
    const index = [...column.querySelectorAll('[data-card-id]')].indexOf(this)
    return make(columnIndex(column) * COLUMN_X + 10, cardTop(index), 260, 40)
  }
  return make(0, 0, 0, 0)
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(fakeRect)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const column = (id: ColumnId) => screen.getByRole('list', { name: COLUMNS.find((c) => c.id === id)!.title })
const cardTexts = (id: ColumnId) =>
  within(column(id))
    .queryAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'))
    .filter(Boolean)
const card = (text: string) => screen.getByRole('listitem', { name: text })
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).cards as { text: string; column: string }[]
const status = () => screen.getByRole('status').textContent

async function openMenu(text: string) {
  fireEvent.click(screen.getByRole('button', { name: `Actions for “${text}”` }))
  return screen.findByRole('menu')
}

describe('the board', () => {
  it('starts with the welcome cards in three columns', () => {
    render(<App />)
    expect(cardTexts('todo')).toEqual(WELCOME.cards.filter((c) => c.column === 'todo').map((c) => c.text))
    expect(cardTexts('doing')).toHaveLength(1)
    expect(cardTexts('done')).toEqual(['Open the board'])
    expect(screen.getByLabelText('3 cards')).toBeTruthy()
    expect(screen.getByText('5 cards, saved in this browser.')).toBeTruthy()
  })

  it('adds cards from a column, keeping the form open for the next one', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a card to Doing' }))
    const field = screen.getByRole('textbox', { name: 'New card in Doing' })
    fireEvent.change(field, { target: { value: 'Write the README' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }))
    fireEvent.change(field, { target: { value: 'Ship it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(cardTexts('doing').slice(1)).toEqual(['Write the README', 'Ship it'])
    expect(status()).toContain('Added a card to Doing.')

    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.queryByRole('textbox', { name: 'New card in Doing' })).toBeNull()
    expect(saved().filter((c) => c.column === 'doing')).toHaveLength(3)
  })

  it('opens the To do form with N', () => {
    render(<App />)
    fireEvent.keyDown(document.body, { key: 'n' })
    const field = screen.getByRole('textbox', { name: 'New card in To do' })
    expect(document.activeElement).toBe(field)
    fireEvent.change(field, { target: { value: 'From the keyboard' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(cardTexts('todo').at(-1)).toBe('From the keyboard')
  })
})

describe('editing', () => {
  it('saves on Enter after a double-click, and keeps focus on the card', () => {
    render(<App />)
    fireEvent.doubleClick(card('Open the board'))
    const editor = screen.getByRole('textbox', { name: 'Card text' })
    fireEvent.change(editor, { target: { value: 'Opened the board' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(cardTexts('done')).toEqual(['Opened the board'])
    expect(document.activeElement).toBe(card('Opened the board'))
    expect(saved().at(-1)!.text).toBe('Opened the board')
  })

  it('cancels on Escape, and ignores an emptied-out edit', () => {
    render(<App />)
    const target = card('Open the board')
    target.focus()
    fireEvent.keyDown(target, { key: 'Enter' })
    let editor = screen.getByRole('textbox', { name: 'Card text' })
    fireEvent.change(editor, { target: { value: 'Never mind' } })
    fireEvent.keyDown(editor, { key: 'Escape' })
    fireEvent.blur(editor)
    expect(cardTexts('done')).toEqual(['Open the board'])

    fireEvent.doubleClick(card('Open the board'))
    editor = screen.getByRole('textbox', { name: 'Card text' })
    fireEvent.change(editor, { target: { value: '  ' } })
    fireEvent.blur(editor)
    expect(cardTexts('done')).toEqual(['Open the board'])
  })

  it('edits from the card menu', async () => {
    render(<App />)
    const menu = await openMenu('Open the board')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByRole('textbox', { name: 'Card text' })).toBeTruthy()
  })
})

describe('deleting', () => {
  it('deletes from the menu and undoes from the toast', async () => {
    render(<App />)
    const menu = await openMenu('Open the board')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    expect(cardTexts('done')).toEqual([])
    expect(screen.getByText('No cards yet')).toBeTruthy()
    expect(status()).toContain('Deleted “Open the board”.')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(cardTexts('done')).toEqual(['Open the board'])
    expect(saved()).toHaveLength(5)
  })

  it('deletes with the Delete key, moves focus to the next card, and undoes with Ctrl+Z', () => {
    render(<App />)
    const first = card('Drag me to Doing')
    first.focus()
    fireEvent.keyDown(first, { key: 'Delete' })
    expect(cardTexts('todo')).toHaveLength(2)
    expect(document.activeElement).toBe(card('Double-click a card to edit it'))

    fireEvent.keyDown(document.activeElement!, { key: 'z', ctrlKey: true })
    expect(cardTexts('todo')[0]).toBe('Drag me to Doing')
  })

  it('clears Done, with undo', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear Done' }))
    expect(cardTexts('done')).toEqual([])
    expect(status()).toContain('Cleared 1 card from Done.')
    expect(screen.queryByRole('button', { name: 'Clear Done' })).toBeNull()
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(cardTexts('done')).toEqual(['Open the board'])
  })

  it('dismisses the toast on its own', () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear Done' }))
      act(() => vi.advanceTimersByTime(8000))
      expect(status()).toBe('')
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('moving with the keyboard and the menu', () => {
  it('moves the focused card with Shift + arrows and keeps it focused', () => {
    render(<App />)
    const target = card('Drag me to Doing')
    target.focus()
    fireEvent.keyDown(target, { key: 'ArrowDown', shiftKey: true })
    expect(cardTexts('todo')[1]).toBe('Drag me to Doing')
    expect(status()).toContain('Moved “Drag me to Doing” to position 2 of 3 in To do.')

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', shiftKey: true })
    expect(cardTexts('doing').at(-1)).toBe('Drag me to Doing')
    expect(document.activeElement).toBe(card('Drag me to Doing'))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', shiftKey: true })
    expect(cardTexts('done').at(-1)).toBe('Drag me to Doing')
    expect(saved().find((c) => c.text === 'Drag me to Doing')!.column).toBe('done')
  })

  it('moves focus between cards with the arrows', () => {
    render(<App />)
    card('Drag me to Doing').focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(card('Double-click a card to edit it'))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe(cardTexts('doing')[0])
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(card('Open the board'))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(card('Open the board'))
  })

  it('moves a card to another column from its menu', async () => {
    render(<App />)
    const menu = await openMenu('Drag me to Doing')
    expect(within(menu).queryByRole('menuitem', { name: 'To do' })).toBeNull()
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Done' }))
    expect(cardTexts('done')).toEqual(['Open the board', 'Drag me to Doing'])
    expect(status()).toContain('Moved “Drag me to Doing” to Done.')
  })
})

describe('filtering', () => {
  it('shows only matching cards, with per-column counts', () => {
    render(<App />)
    fireEvent.keyDown(document.body, { key: '/' })
    const filter = screen.getByRole('searchbox', { name: 'Filter cards' })
    expect(document.activeElement).toBe(filter)
    fireEvent.change(filter, { target: { value: 'DRAG' } })
    expect(cardTexts('todo')).toEqual(['Drag me to Doing'])
    expect(screen.getByLabelText('1 of 3 cards')).toBeTruthy()
    expect(screen.getAllByText('No matching cards')).toHaveLength(2)

    fireEvent.keyDown(filter, { key: 'Escape' })
    expect(cardTexts('todo')).toHaveLength(3)
  })

  it('moves past hidden cards while filtered', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter cards' }), { target: { value: 'n' } })
    expect(cardTexts('todo')).toEqual(['Drag me to Doing', 'Press / to filter cards, N to add one'])
    const target = card('Press / to filter cards, N to add one')
    target.focus()
    fireEvent.keyDown(target, { key: 'ArrowUp', shiftKey: true })
    expect(status()).toContain('position 1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(cardTexts('todo')).toEqual(['Press / to filter cards, N to add one', 'Drag me to Doing', 'Double-click a card to edit it'])
  })
})

describe('dragging', () => {
  const press = (element: Element, x: number, y: number, pointerType = 'mouse') =>
    fireEvent.pointerDown(element, { pointerId: 1, button: 0, isPrimary: true, pointerType, clientX: x, clientY: y })
  const moveTo = (x: number, y: number) => fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y })
  const release = (x: number, y: number) => fireEvent.pointerUp(window, { pointerId: 1, clientX: x, clientY: y })

  it('drops a card into another column', () => {
    render(<App />)
    press(card('Drag me to Doing'), 50, cardTop(0) + 20)
    moveTo(60, cardTop(0) + 30)
    moveTo(COLUMN_X + 50, 600)
    // The card leaves its column while it's carried, and a gap opens where it would land.
    expect(cardTexts('todo')).toHaveLength(2)
    expect(within(column('doing')).getAllByRole('listitem', { hidden: true })).toHaveLength(2)
    release(COLUMN_X + 50, 600)

    expect(cardTexts('doing')).toEqual(['Focus a card and press Shift + arrows to move it', 'Drag me to Doing'])
    expect(status()).toContain('Moved “Drag me to Doing” to Doing.')
    expect(saved().find((c) => c.text === 'Drag me to Doing')!.column).toBe('doing')
  })

  it('reorders within a column', () => {
    render(<App />)
    press(card('Press / to filter cards, N to add one'), 50, cardTop(2) + 20)
    moveTo(50, cardTop(0))
    release(50, cardTop(0))
    expect(cardTexts('todo')[0]).toBe('Press / to filter cards, N to add one')
  })

  it('treats a press without movement as a click, and Escape as a cancel', () => {
    render(<App />)
    press(card('Drag me to Doing'), 50, 120)
    release(50, 121)
    moveTo(COLUMN_X * 2 + 50, 500)
    expect(cardTexts('todo')).toHaveLength(3)

    press(card('Drag me to Doing'), 50, 120)
    moveTo(COLUMN_X * 2 + 50, 500)
    fireEvent.keyDown(window, { key: 'Escape' })
    release(COLUMN_X * 2 + 50, 500)
    expect(cardTexts('todo')).toHaveLength(3)
    expect(cardTexts('done')).toEqual(['Open the board'])
  })

  it('lets touch drag only by the handle, so swipes still scroll', () => {
    render(<App />)
    const target = card('Drag me to Doing')
    press(target.querySelector('p')!, 50, 120, 'touch')
    moveTo(COLUMN_X * 2 + 50, 500)
    release(COLUMN_X * 2 + 50, 500)
    expect(cardTexts('done')).toEqual(['Open the board'])

    press(target.querySelector('[data-drag-handle]')!, 20, 120, 'touch')
    moveTo(COLUMN_X * 2 + 50, 500)
    release(COLUMN_X * 2 + 50, 500)
    expect(cardTexts('done')).toEqual(['Open the board', 'Drag me to Doing'])
  })
})

describe('saved data', () => {
  it('comes back after a reload', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear Done' }))
    unmount()
    render(<App />)
    expect(cardTexts('done')).toEqual([])
    expect(cardTexts('todo')).toHaveLength(3)
  })

  it('falls back to the welcome board when corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{"cards": oops')
    render(<App />)
    expect(cardTexts('todo')).toHaveLength(3)
  })
})
