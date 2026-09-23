import type { ColumnId } from './board'

/**
 * One hue per column — sky for what's waiting, amber for what's in flight, emerald for
 * what's finished — carried through the column, its header, its cards and the drop gap, so
 * a card's colour tells you where it is even mid-drag. Written out in full so Tailwind
 * can see every class.
 */
export const COLUMN_STYLE: Record<
  ColumnId,
  {
    column: string
    over: string
    dot: string
    title: string
    badge: string
    stripe: string
    handle: string
    gap: string
    add: string
  }
> = {
  todo: {
    column: 'bg-sky-50 ring-sky-200/80 dark:bg-sky-950/40 dark:ring-sky-800/40',
    over: 'ring-2 ring-sky-400 dark:ring-sky-500',
    dot: 'bg-sky-500',
    title: 'text-sky-800 dark:text-sky-200',
    badge: 'bg-sky-200/70 text-sky-800 dark:bg-sky-800/60 dark:text-sky-100',
    stripe: 'border-l-sky-400 dark:border-l-sky-500',
    handle: 'text-sky-400/70 group-hover/card:text-sky-500 dark:text-sky-500/60',
    gap: 'border-sky-400/60 bg-sky-100/70 dark:border-sky-500/50 dark:bg-sky-900/30',
    add: 'text-sky-700 hover:bg-sky-100 hover:text-sky-900 dark:text-sky-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-100',
  },
  doing: {
    column: 'bg-amber-50 ring-amber-200/80 dark:bg-amber-950/30 dark:ring-amber-800/40',
    over: 'ring-2 ring-amber-400 dark:ring-amber-500',
    dot: 'bg-amber-500',
    title: 'text-amber-800 dark:text-amber-200',
    badge: 'bg-amber-200/70 text-amber-900 dark:bg-amber-800/60 dark:text-amber-100',
    stripe: 'border-l-amber-400 dark:border-l-amber-500',
    handle: 'text-amber-400/80 group-hover/card:text-amber-500 dark:text-amber-500/60',
    gap: 'border-amber-400/60 bg-amber-100/70 dark:border-amber-500/50 dark:bg-amber-900/30',
    add: 'text-amber-800 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-amber-900/50 dark:hover:text-amber-100',
  },
  done: {
    column: 'bg-emerald-50 ring-emerald-200/80 dark:bg-emerald-950/40 dark:ring-emerald-800/40',
    over: 'ring-2 ring-emerald-400 dark:ring-emerald-500',
    dot: 'bg-emerald-500',
    title: 'text-emerald-800 dark:text-emerald-200',
    badge: 'bg-emerald-200/70 text-emerald-900 dark:bg-emerald-800/60 dark:text-emerald-100',
    stripe: 'border-l-emerald-400 dark:border-l-emerald-500',
    handle: 'text-emerald-400/80 group-hover/card:text-emerald-500 dark:text-emerald-500/60',
    gap: 'border-emerald-400/60 bg-emerald-100/70 dark:border-emerald-500/50 dark:bg-emerald-900/30',
    add: 'text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-100',
  },
}
