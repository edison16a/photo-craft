/**
 * Focus helpers for the editor.
 */

/**
 * Blurs whatever form field has focus so it commits its draft before the
 * selection changes. Called from canvas mouse handlers, which run before
 * the browser moves focus on its own.
 */
export function blurActiveField(): void {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) active.blur();
}
