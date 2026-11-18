/**
 * What presses, clicks and double clicks on canvas elements do to the
 * selection. The canvas turns Konva events into these calls, so the rules
 * can be tested without a stage.
 *
 * A press selects the unit under the pointer, so a drag that follows moves
 * it. A click on something that was already selected narrows a bigger
 * selection to that unit, or else steps to the next unit behind it. The
 * second click of a double click does neither, and when the element has a
 * double click action of its own the step waits out the double click
 * window first.
 */
import { nextUnitUnder } from "../lib/click-through";
import { expandToGroups, toggleUnitSelection, unitKey } from "../lib/groups";
import type { CanvasElement, Point } from "../model/types";
import { useEditorUiStore } from "./editor-ui-store";
import { useProjectStore } from "./project-store";
import { selectCurrentElements } from "./selectors";

/** Konva's double click window, the default of Konva.dblClickWindow. */
export const DOUBLE_CLICK_MS = 400;
/** How far in screen pixels a click may land from the last step and still count as the same spot. */
export const SAME_SPOT_PX = 8;

/** What the canvas knows about a press or a click. */
export interface PointerInput {
  /** The element Konva hit. */
  id: string;
  /** Page pixels under the pointer. */
  point: Point;
  /** Ids of every element drawn under the pointer. A function, since finding them redraws each shape. */
  under: () => readonly string[];
  /** Mouse button, 0 for touch. */
  button: number;
  shift: boolean;
  /** Ctrl, or Cmd on a Mac. */
  mod: boolean;
}

interface Press {
  id: string;
  /** The element the press counts for: the one hit, or a selected one beneath it. */
  actsOn: string;
  /** A plain press on something that was already selected, so a click may narrow or step. */
  wasSelected: boolean;
  /** The press landed on another element over the selection, which it keeps. */
  keepsSelection: boolean;
}

let press: Press | null = null;
let lastClick: { id: string; time: number } | null = null;
let pendingStep: ReturnType<typeof setTimeout> | null = null;
/** Where the last step landed and what it selected. */
let lastStep: { point: Point; ids: string[] } | null = null;

/** True for elements whose double click does something: unlocked text, and any grouped element. */
export function hasDoubleClickAction(element: CanvasElement): boolean {
  return (element.type === "text" && !element.locked) || element.groupId !== undefined;
}

/** Handles a press on an element. */
export function pressElement(input: PointerInput): void {
  cancelPendingStep();
  const store = useProjectStore.getState();
  const elements = selectCurrentElements(store);
  const plain = input.button === 0 && !input.shift && !input.mod;
  const beneath = plain ? selectedBeneath(elements, store.selectedIds, input) : undefined;
  const wasSelected = plain && (store.selectedIds.includes(input.id) || beneath !== undefined);
  if (input.button !== 0) selectForMenu(input);
  else if (input.shift) store.setSelection(toggleUnitSelection(elements, store.selectedIds, input.id));
  else if (input.mod) store.setSelection([input.id]);
  else if (!wasSelected) store.setSelection(expandToGroups(elements, [input.id]));
  press = { id: input.id, actsOn: beneath ?? input.id, wasSelected, keepsSelection: beneath !== undefined };
}

/** Handles a click, a press and release without a drag. */
export function clickElement(input: PointerInput): void {
  const current = press;
  press = null;
  if (input.button !== 0 || !current || current.id !== input.id) return;
  const now = Date.now();
  const repeat = lastClick !== null && lastClick.id === input.id && now - lastClick.time < DOUBLE_CLICK_MS;
  lastClick = { id: input.id, time: now };
  if (repeat || !current.wasSelected) return;

  const store = useProjectStore.getState();
  const elements = selectCurrentElements(store);
  const actsOn = elements.find((element) => element.id === current.actsOn);
  if (!actsOn) return;
  const unit = elements
    .filter((element) => store.selectedIds.includes(element.id) && unitKey(element) === unitKey(actsOn))
    .map((element) => element.id);
  if (store.selectedIds.length > unit.length) {
    store.setSelection(unit);
    return;
  }

  const selectionAtClick = store.selectedIds;
  const under = input.under();
  const step = () => {
    pendingStep = null;
    const latest = useProjectStore.getState();
    if (latest.selectedIds !== selectionAtClick) return;
    const next = nextUnitUnder(selectCurrentElements(latest), actsOn.id, under);
    if (!next) return;
    latest.setSelection(next);
    lastStep = { point: input.point, ids: next };
  };
  const clicked = elements.find((element) => element.id === input.id);
  if (clicked && hasDoubleClickAction(clicked)) pendingStep = setTimeout(step, DOUBLE_CLICK_MS);
  else step();
}

/** Handles a double click: text opens for editing, a grouped element is picked out of its group. */
export function doubleClickElement(id: string): void {
  cancelPendingStep();
  const store = useProjectStore.getState();
  const element = selectCurrentElements(store).find((candidate) => candidate.id === id);
  if (!element) return;
  if (element.type === "text" && !element.locked) {
    store.setSelection([id]);
    useEditorUiStore.getState().setEditingText(id);
  } else if (element.groupId !== undefined) {
    store.setSelection([id]);
  }
}

/**
 * Selects what a right click acts on. The selection stays when it holds
 * the element, or when the click lands where the last step selected
 * something beneath it. Otherwise the element's unit is selected.
 */
export function selectForMenu(input: Pick<PointerInput, "id" | "point" | "under">): void {
  const store = useProjectStore.getState();
  const elements = selectCurrentElements(store);
  if (store.selectedIds.includes(input.id)) return;
  if (selectedBeneath(elements, store.selectedIds, input)) return;
  store.setSelection(expandToGroups(elements, [input.id]));
}

/** True while the current press keeps a selection that lies under the element it hit, so a drag moves that selection. */
export function pressKeepsSelection(): boolean {
  return press?.keepsSelection ?? false;
}

/** Counts a colour pick on an image as a click on it, so the rest of a double click does not step. */
export function notePick(id: string): void {
  lastClick = { id, time: Date.now() };
}

/** Forgets earlier presses, clicks and steps. */
export function resetElementClicks(): void {
  cancelPendingStep();
  press = null;
  lastClick = null;
  lastStep = null;
}

/**
 * The selected element a press counts for when it hits an unselected
 * element on top: only when the press lands on the spot of the last step,
 * the selection is still what that step chose, and a selected element is
 * drawn under the pointer. The topmost such element wins.
 */
function selectedBeneath(
  elements: readonly CanvasElement[],
  selectedIds: readonly string[],
  input: Pick<PointerInput, "id" | "point" | "under">,
): string | undefined {
  if (!lastStep || selectedIds.includes(input.id)) return undefined;
  const sameSelection = lastStep.ids.length === selectedIds.length && lastStep.ids.every((id) => selectedIds.includes(id));
  const zoom = useEditorUiStore.getState().zoom;
  const distance = Math.hypot(input.point.x - lastStep.point.x, input.point.y - lastStep.point.y) * zoom;
  if (!sameSelection || distance > SAME_SPOT_PX) return undefined;
  const under = input.under();
  return elements.findLast((element) => selectedIds.includes(element.id) && under.includes(element.id))?.id;
}

function cancelPendingStep(): void {
  if (pendingStep) clearTimeout(pendingStep);
  pendingStep = null;
}
