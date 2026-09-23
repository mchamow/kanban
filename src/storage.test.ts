import { describe, expect, it } from 'vitest'
import { WELCOME } from './board'
import { loadBoard, saveBoard, STORAGE_KEY } from './storage'

const stored = (value: string | null) => ({ getItem: (key: string) => (key === STORAGE_KEY ? value : null) })

describe('loadBoard', () => {
  it('starts with the welcome cards when nothing is saved', () => {
    expect(loadBoard(stored(null))).toBe(WELCOME)
  })

  it('falls back to the welcome cards on corrupt data', () => {
    expect(loadBoard(stored('{not json'))).toBe(WELCOME)
    expect(loadBoard(stored('42'))).toBe(WELCOME)
    expect(loadBoard(stored('{"cards":"nope"}'))).toBe(WELCOME)
  })

  it('keeps an empty board empty', () => {
    expect(loadBoard(stored('{"cards":[]}'))).toEqual({ cards: [] })
  })

  it('keeps the good cards and drops the bad ones', () => {
    const cards = [
      { id: 'a', text: ' keep ', column: 'doing' },
      { id: 'a', text: 'duplicate id', column: 'todo' },
      { id: 'b', text: 'bad column', column: 'later' },
      { id: 'c', text: '   ', column: 'todo' },
      { id: 7, text: 'bad id', column: 'todo' },
      null,
      { id: 'd', text: 'also keep', column: 'done' },
    ]
    expect(loadBoard(stored(JSON.stringify({ cards })))).toEqual({
      cards: [
        { id: 'a', text: 'keep', column: 'doing' },
        { id: 'd', text: 'also keep', column: 'done' },
      ],
    })
  })
})

describe('saveBoard', () => {
  it('round-trips through loadBoard', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    saveBoard(WELCOME, storage)
    expect(loadBoard(storage)).toEqual(WELCOME)
  })

  it('shrugs off a storage that throws', () => {
    const storage = {
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(() => saveBoard(WELCOME, storage)).not.toThrow()
  })
})
