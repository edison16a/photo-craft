/**
 * Keys that trigger editor actions. Each action has at most one key, a
 * single character pressed on its own, and a key belongs to at most one
 * action. The table is saved with the app settings and never fires while
 * something is being typed.
 */

/** Everything a key can be bound to. */
export type KeybindAction = "select" | "text" | "shapes" | "draw" | "upload" | "removeBackground";

/** The key for each action, lowercase, or null when unset. */
export type Keybinds = Record<KeybindAction, string | null>;

/** How the settings list an action. */
export interface KeybindSpec {
  action: KeybindAction;
  label: string;
  group: string;
}

/** The bindable actions in the order the settings list them. */
export const KEYBIND_SPECS: KeybindSpec[] = [
  { action: "select", label: "Select", group: "Tools" },
  { action: "text", label: "Text", group: "Tools" },
  { action: "shapes", label: "Shapes", group: "Tools" },
  { action: "draw", label: "Draw", group: "Tools" },
  { action: "upload", label: "Upload", group: "Tools" },
  { action: "removeBackground", label: "Remove or restore background", group: "Image" },
];

export const KEYBIND_ACTIONS: KeybindAction[] = KEYBIND_SPECS.map((spec) => spec.action);

/** What a fresh install starts with. */
export const DEFAULT_KEYBINDS: Keybinds = { select: "s", text: "t", shapes: "h", draw: "d", upload: "u", removeBackground: "r" };

/** True for a key that can be bound: one printable character. */
export function isBindableKey(key: string): boolean {
  return key.length === 1 && key.trim().length === 1;
}

/** The stored form of a key, so S and Shift+S are the same binding. */
export function normaliseKey(key: string): string {
  return key.toLowerCase();
}

/** How a bound key is shown. */
export function keyLabel(key: string): string {
  return key.toUpperCase();
}

/** Gives an action a key, taking it away from any other action that had it. Null unsets. */
export function assignKey(binds: Keybinds, action: KeybindAction, key: string | null): Keybinds {
  const next = { ...binds };
  const normalised = key === null ? null : normaliseKey(key);
  if (normalised !== null) {
    for (const other of KEYBIND_ACTIONS) if (next[other] === normalised) next[other] = null;
  }
  next[action] = normalised;
  return next;
}

/** The action bound to a key, if any. */
export function actionForKey(binds: Keybinds, key: string): KeybindAction | null {
  const normalised = normaliseKey(key);
  return KEYBIND_ACTIONS.find((action) => binds[action] === normalised) ?? null;
}

/**
 * Reads a binding table out of whatever was stored. An action that is
 * missing or holds something that is not a key gets its default; null
 * stays null, since the user cleared it on purpose.
 */
export function coerceKeybinds(raw: unknown): Keybinds {
  const result: Keybinds = { ...DEFAULT_KEYBINDS };
  if (typeof raw !== "object" || raw === null) return result;
  const source = raw as Record<string, unknown>;
  for (const action of KEYBIND_ACTIONS) {
    const value = source[action];
    if (value === null) result[action] = null;
    else if (typeof value === "string" && isBindableKey(value)) result[action] = normaliseKey(value);
  }
  return result;
}
