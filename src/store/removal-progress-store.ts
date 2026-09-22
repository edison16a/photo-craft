/**
 * What the background remover is doing right now, for any part of the
 * app that wants to show it: the model download on first use, the load,
 * and which job is running. Fed by the background removal service.
 */
import { create } from "zustand";
import type { RemovalPhase } from "../lib/background/messages";

/** The remover's current state. */
export interface RemovalProgressState {
  /** Null while idle. */
  phase: RemovalPhase | null;
  /** Bytes downloaded so far, only meaningful in the download phase. */
  loaded: number;
  /** Total bytes of the download, 0 when unknown. */
  total: number;
  /** True once the model is loaded and ready, so later runs skip the wait. */
  ready: boolean;
  /** Ids of jobs waiting or running, oldest first. */
  pending: number[];
  /** Which engine runs the model, once known. */
  backend: "webgpu" | "wasm" | null;

  setPhase: (phase: RemovalPhase | null, loaded?: number, total?: number) => void;
  setBackend: (backend: "webgpu" | "wasm") => void;
  setReady: () => void;
  addPending: (id: number) => void;
  removePending: (id: number) => void;
}

/** Store for the remover's progress. Not saved anywhere. */
export const useRemovalProgressStore = create<RemovalProgressState>()((set) => ({
  phase: null,
  loaded: 0,
  total: 0,
  ready: false,
  pending: [],
  backend: null,

  setPhase: (phase, loaded = 0, total = 0) => set({ phase, loaded, total }),
  setBackend: (backend) => set({ backend }),
  setReady: () => set({ ready: true }),
  addPending: (id) => set((state) => ({ pending: [...state.pending, id] })),
  removePending: (id) => set((state) => ({ pending: state.pending.filter((candidate) => candidate !== id) })),
}));

/** A short line describing the current phase, for buttons and panels. */
export function describeRemovalPhase(state: Pick<RemovalProgressState, "phase" | "loaded" | "total">): string | null {
  if (state.phase === "download") {
    const percent = state.total > 0 ? Math.round((state.loaded / state.total) * 100) : null;
    const size = state.total > 0 ? ` of ${Math.round(state.total / 1000000)} MB` : "";
    return percent === null ? "Downloading the model" : `Downloading the model ${percent}%${size}`;
  }
  if (state.phase === "load") return "Loading the model";
  if (state.phase === "run") return "Removing background";
  return null;
}
