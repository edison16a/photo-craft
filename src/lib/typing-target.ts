/**
 * Tells whether a keyboard event belongs to a field the user is typing in,
 * so editor shortcuts stay out of the way. Sliders, checkboxes, colour
 * inputs and buttons are not typing targets even though they are inputs.
 */
const TEXT_INPUT_TYPES = new Set(["text", "number", "search", "email", "url", "password", "tel", ""]);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return TEXT_INPUT_TYPES.has((target as HTMLInputElement).type.toLowerCase());
  return false;
}

/** Tells whether the event belongs to a slider, which owns the arrow keys while it has focus. */
export function isSliderTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement && target.type.toLowerCase() === "range";
}
