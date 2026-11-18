/**
 * Reads which button a press on the canvas stands for. On a Mac, Ctrl
 * with the main button is the right click, so only Cmd picks one
 * element there. Elsewhere Ctrl or Cmd picks one.
 */

/** The parts of a mouse or touch event the reading depends on. Touch events have no button. */
export interface ButtonEvent {
  button?: number;
  ctrlKey: boolean;
  metaKey: boolean;
}

/** The button a press stands for, 0 for touch, and whether it asks to pick one element. */
export function readButtons(evt: ButtonEvent, mac: boolean): { button: number; mod: boolean } {
  const button = evt.button ?? 0;
  if (!mac) return { button, mod: evt.ctrlKey || evt.metaKey };
  return { button: evt.ctrlKey && button === 0 ? 2 : button, mod: evt.metaKey };
}

/** True on a Mac, where Ctrl with a click opens the context menu. */
export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
}
