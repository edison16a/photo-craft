/**
 * Snapshot based undo history.
 *
 * Snapshots are plain references. The store never mutates a project in
 * place, so keeping old project objects around is cheap: unchanged pages and
 * elements are shared between snapshots.
 */

export interface History<T> {
  past: T[];
  future: T[];
}

/** How many undo steps we keep before dropping the oldest. */
export const HISTORY_LIMIT = 80;

/** An empty history. */
export function emptyHistory<T>(): History<T> {
  return { past: [], future: [] };
}

/** Records a snapshot of the state before a change and clears redo. */
export function pushHistory<T>(history: History<T>, snapshot: T): History<T> {
  const past = [...history.past, snapshot];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [] };
}

/**
 * Steps back one snapshot. Returns the snapshot to restore and the new
 * history, or null when there is nothing to undo.
 */
export function undoHistory<T>(
  history: History<T>,
  current: T,
): { history: History<T>; snapshot: T } | null {
  if (history.past.length === 0) return null;
  const past = history.past.slice(0, -1);
  const snapshot = history.past[history.past.length - 1];
  return { history: { past, future: [current, ...history.future] }, snapshot };
}

/** Steps forward one snapshot, or returns null when there is nothing to redo. */
export function redoHistory<T>(
  history: History<T>,
  current: T,
): { history: History<T>; snapshot: T } | null {
  if (history.future.length === 0) return null;
  const [snapshot, ...future] = history.future;
  return { history: { past: [...history.past, current], future }, snapshot };
}
