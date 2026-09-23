# 📋 Kanban Board

[![Test and deploy](https://github.com/mchamow/kanban/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/kanban/actions/workflows/deploy.yml)

**Day 7 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: a three-column board where you drag cards across To do, Doing and Done, with a mouse, a finger or the keyboard. Everything is saved in your browser.

**Live demo:** https://mchamow.github.io/kanban/

## Features

- Drag cards between columns and reorder them within one. A gap opens where the card will land, dropping below a short column still lands in it, and <kbd>Esc</kbd> cancels mid-drag
- Works on touch: grab a card by its grip handle, so swiping over a card still scrolls the page, and the page scrolls along when you drag near the edge
- Keyboard: arrows move focus between cards, <kbd>Shift</kbd> + arrows move the focused card, <kbd>Enter</kbd> edits it, <kbd>Del</kbd> deletes it
- Add cards per column (<kbd>Enter</kbd> adds and keeps the box open for the next one) or press <kbd>N</kbd> to add one to To do
- Double-click a card to edit it. <kbd>Enter</kbd> saves, <kbd>Shift</kbd>+<kbd>Enter</kbd> starts a new line, <kbd>Esc</kbd> cancels
- A menu on every card: edit, move up or down, move to another column, delete
- Filter cards as you type (<kbd>/</kbd> focuses the filter). Each column shows how many of its cards match, and keyboard moves skip the hidden cards
- Delete a card or clear Done, then change your mind: Undo in the toast, or <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Z</kbd>
- Every move is announced to screen readers ("Moved “Ship it” to Done.")
- Saved to `localStorage`; unreadable data falls back to the welcome board, and bad entries are dropped one by one
- A colour per column (sky, amber, emerald) carried through its cards, badge and drop highlight, in both light and dark themes
- A stacked layout for a 360px phone

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

Drag and drop is built on pointer events rather than a library or the HTML5 drag API. The HTML5 API doesn't work on touch screens and gives you little control over what's shown while dragging. [`src/useCardDrag.ts`](src/useCardDrag.ts) waits for 5px of movement before a press becomes a drag, so clicks stay clicks. It then floats a copy of the card under the pointer and hit-tests the columns on every move: the column under the pointer, or the nearest one, and inside it the first card whose middle is below the pointer.

The board itself is a flat list of cards, and a card's place in its column is its place in that list ([`src/board.ts`](src/board.ts)). Every move is "put this card before that one", never "at index 3". That's what keeps keyboard moves and drops correct while a filter hides some cards. The state changes and the messages they announce live in a reducer ([`src/boardReducer.ts`](src/boardReducer.ts)), and all of it is unit-tested apart from the UI.

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 54 unit and component tests (Vitest)
```
