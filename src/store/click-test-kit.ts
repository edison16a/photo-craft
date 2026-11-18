/**
 * Shared set up for the element click tests: a page of elements, and
 * presses and clicks on them as the canvas reports them.
 */
import { vi } from "vitest";
import { createShapeElement } from "../model/element-factories";
import { createProject } from "../model/project-factories";
import type { CanvasElement } from "../model/types";
import { clickElement, DOUBLE_CLICK_MS, pressElement, type PointerInput } from "./element-clicks";
import { useProjectStore } from "./project-store";

/** The project store's current state. */
export const store = () => useProjectStore.getState();

/** Where presses land unless a test says otherwise. */
export const at = { x: 50, y: 50 };

/** Every element on the page, all drawn under the pointer unless a test says otherwise. */
export const everything = () => store().project?.pages[0].elements.map((element) => element.id) ?? [];

/** A pointer event on an element. */
export function input(id: string, extra: Partial<PointerInput> = {}): PointerInput {
  return { id, point: at, under: everything, button: 0, shift: false, mod: false, ...extra };
}

/** A press and release on one element, then a pause long enough to not be a double click. */
export function click(id: string, extra: Partial<PointerInput> = {}): void {
  pressElement(input(id, extra));
  clickElement(input(id, extra));
  vi.advanceTimersByTime(DOUBLE_CLICK_MS + 1);
}

/** Loads a fresh project whose first page holds these elements, bottom first. */
export function load(elements: CanvasElement[]): void {
  store().loadProject(createProject("Test", 800, 600));
  store().addElements(elements, false);
}

/** A 100 by 100 rectangle at the page's top left corner. */
export const rect = (id: string, extra: Partial<CanvasElement> = {}) =>
  createShapeElement("rectangle", { id, width: 100, height: 100, ...extra });
