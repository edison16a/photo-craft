/**
 * The pictures on the remove background page: what was added, how far
 * each one has got and which one is showing. Nothing here is saved; the
 * page starts empty on every visit. Object URLs are owned by whoever
 * creates them, so the store never revokes anything.
 */
import { create } from "zustand";

/** Where a picture is in the queue. */
export type RemovalStatus = "queued" | "working" | "done" | "failed";

/** One picture on the page, before and after. */
export interface RemovalItem {
  id: string;
  /** File name without its extension, used for downloads. */
  name: string;
  /** The picture as added, already decoded and capped to a sane size. */
  original: Blob;
  /** Object URL of the original, for showing it. */
  originalUrl: string;
  width: number;
  height: number;
  status: RemovalStatus;
  /** The cutout as a PNG with transparency, once done. */
  result?: Blob;
  /** Object URL of the cutout, once done. */
  resultUrl?: string;
  /** Why it failed, when it did. */
  error?: string;
  /** What the model made, kept once brushes have changed the cutout, so it can be reset. */
  pristine?: Blob;
}

/** The brush settings shared by every picture on the page. */
export interface TouchUpState {
  tool: "restore" | "erase" | null;
  /** Brush diameter in picture pixels. */
  size: number;
  /** Softness of the brush edge, 0 to 1. */
  softness: number;
}

/** State and actions of the remove background page. */
export interface RemoveBgState {
  items: RemovalItem[];
  selectedId: string | null;
  touchUp: TouchUpState;

  /** Appends pictures and shows the first of them when nothing is showing. */
  addItems: (items: RemovalItem[]) => void;
  select: (id: string | null) => void;
  /** Shows the picture before or after the current one, wrapping around. */
  selectNeighbour: (step: 1 | -1) => void;
  markWorking: (id: string) => void;
  finish: (id: string, result: Blob, resultUrl: string) => void;
  fail: (id: string, error: string) => void;
  /** Swaps in a cutout changed by the brushes, remembering the model's own when given. */
  updateResult: (id: string, result: Blob, resultUrl: string, pristine: Blob | undefined) => void;
  setTouchUp: (patch: Partial<TouchUpState>) => void;
  /** Puts a failed picture back in the queue. */
  retry: (id: string) => void;
  /** Drops a picture. When it was showing, its neighbour shows instead. */
  remove: (id: string) => void;
  clear: () => void;
}

function patchItem(items: RemovalItem[], id: string, patch: Partial<RemovalItem>): RemovalItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

/** Store for the remove background page. */
export const useRemoveBgStore = create<RemoveBgState>()((set, get) => ({
  items: [],
  selectedId: null,
  touchUp: { tool: null, size: 40, softness: 0.5 },

  addItems: (added) =>
    set((state) => ({
      items: [...state.items, ...added],
      selectedId: state.selectedId ?? added[0]?.id ?? null,
    })),
  select: (id) => set({ selectedId: id }),
  selectNeighbour: (step) => {
    const { items, selectedId } = get();
    if (items.length === 0) return;
    const index = items.findIndex((item) => item.id === selectedId);
    const next = index === -1 ? 0 : (index + step + items.length) % items.length;
    set({ selectedId: items[next].id });
  },
  markWorking: (id) => set((state) => ({ items: patchItem(state.items, id, { status: "working", error: undefined }) })),
  finish: (id, result, resultUrl) =>
    set((state) => ({ items: patchItem(state.items, id, { status: "done", result, resultUrl, error: undefined }) })),
  fail: (id, error) => set((state) => ({ items: patchItem(state.items, id, { status: "failed", error }) })),
  updateResult: (id, result, resultUrl, pristine) => set((state) => ({ items: patchItem(state.items, id, { result, resultUrl, pristine }) })),
  setTouchUp: (patch) => set((state) => ({ touchUp: { ...state.touchUp, ...patch } })),
  retry: (id) => set((state) => ({ items: patchItem(state.items, id, { status: "queued", error: undefined }) })),
  remove: (id) =>
    set((state) => {
      const index = state.items.findIndex((item) => item.id === id);
      if (index === -1) return state;
      const items = state.items.filter((item) => item.id !== id);
      let selectedId = state.selectedId;
      if (selectedId === id) selectedId = items[Math.min(index, items.length - 1)]?.id ?? null;
      return { items, selectedId };
    }),
  clear: () => set({ items: [], selectedId: null }),
}));

/** The next picture waiting its turn, or undefined when the queue is empty or busy. */
export function nextQueuedItem(items: RemovalItem[]): RemovalItem | undefined {
  if (items.some((item) => item.status === "working")) return undefined;
  return items.find((item) => item.status === "queued");
}
