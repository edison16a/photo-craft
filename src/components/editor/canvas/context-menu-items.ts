/**
 * Builds the entries of the right click menu from what is under the pointer.
 */
import type { CanvasElement } from "../../../model/types";
import { toggleColorPick } from "../../../store/chroma-key-actions";
import { useEditorUiStore } from "../../../store/editor-ui-store";
import { useProjectStore } from "../../../store/project-store";
import type { IconName } from "../../ui/icon-paths";

export interface MenuEntry {
  id: string;
  label: string;
  icon?: IconName;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  run: () => void;
}

/** A visual break between groups. */
export const MENU_DIVIDER: MenuEntry = { id: "divider", label: "", run: () => undefined };

interface MenuContext {
  selected: CanvasElement[];
  /** Page position of the right click, for actions that place things. */
  point: { x: number; y: number };
  removeBackgroundAvailable: boolean;
  /** What the background entry says, since it also puts a background back. */
  removeBackgroundLabel: string;
  onRemoveBackground: () => void;
}

/** Entries for a right click on empty page area. */
export function pageMenuEntries(point: { x: number; y: number }): MenuEntry[] {
  const store = useProjectStore.getState;
  const ui = useEditorUiStore.getState;
  return [
    { id: "paste", label: "Paste", icon: "duplicate", shortcut: "Ctrl+V", disabled: store().clipboard.length === 0, run: () => store().paste() },
    { id: "select-all", label: "Select all", shortcut: "Ctrl+A", run: () => store().selectAll() },
    MENU_DIVIDER,
    { id: "add-text", label: "Add text here", icon: "text", run: () => ui().requestTextAt(point) },
  ];
}

/** Entries for a right click on one or more selected elements. */
export function elementMenuEntries(context: MenuContext): MenuEntry[] {
  const { selected } = context;
  const store = useProjectStore.getState;
  const ids = selected.map((el) => el.id);
  const single = selected.length === 1 ? selected[0] : null;
  const allLocked = selected.every((el) => el.locked);
  const entries: MenuEntry[] = [];

  if (single?.type === "text") {
    entries.push({ id: "edit-text", label: "Edit text", icon: "text", run: () => useEditorUiStore.getState().setEditingText(single.id) });
  }
  if (single?.type === "image") {
    entries.push({
      id: "remove-background",
      label: context.removeBackgroundLabel,
      icon: "image",
      disabled: !context.removeBackgroundAvailable,
      run: context.onRemoveBackground,
    });
    entries.push({ id: "chroma-key", label: "Chroma key", icon: "eyedropper", run: () => toggleColorPick(single.id) });
  }
  if (entries.length > 0) entries.push(MENU_DIVIDER);

  // A unit is a group or an element on its own, see lib/groups.
  const unitCount = new Set(selected.map((el) => el.groupId ?? el.id)).size;
  const groupEntries: MenuEntry[] = [];
  if (unitCount >= 2) {
    groupEntries.push({ id: "group", label: "Group", icon: "group", shortcut: "Ctrl+G", run: () => store().groupElements(ids) });
  }
  if (selected.some((el) => el.groupId !== undefined)) {
    groupEntries.push({ id: "ungroup", label: "Ungroup", icon: "ungroup", shortcut: "Ctrl+Shift+G", run: () => store().ungroupElements(ids) });
  }
  if (groupEntries.length > 0) groupEntries.push(MENU_DIVIDER);

  entries.push(
    { id: "flip-h", label: "Flip horizontally", icon: "flipH", run: () => store().flip(ids, "x") },
    { id: "flip-v", label: "Flip vertically", icon: "flipV", run: () => store().flip(ids, "y") },
    {
      id: "rotate",
      label: "Rotate 90 degrees",
      icon: "rotate",
      disabled: allLocked,
      run: () => store().rotateQuarter(ids),
    },
    MENU_DIVIDER,
    { id: "front", label: "Bring to front", icon: "toFront", run: () => store().reorder(ids, "front") },
    { id: "forward", label: "Bring forward", icon: "forward", run: () => store().reorder(ids, "forward") },
    { id: "backward", label: "Send backward", icon: "backward", run: () => store().reorder(ids, "backward") },
    { id: "back", label: "Send to back", icon: "toBack", run: () => store().reorder(ids, "back") },
    MENU_DIVIDER,
    ...groupEntries,
    { id: "lock", label: allLocked ? "Unlock" : "Lock", icon: allLocked ? "unlock" : "lock", run: () => store().setLocked(ids, !allLocked) },
    { id: "copy", label: "Copy", icon: "duplicate", shortcut: "Ctrl+C", run: () => store().copy(ids) },
    { id: "duplicate", label: "Duplicate", icon: "duplicate", shortcut: "Ctrl+D", run: () => store().duplicateElements(ids) },
    MENU_DIVIDER,
    { id: "delete", label: "Delete", icon: "trash", shortcut: "Del", danger: true, run: () => store().removeElements(ids) },
  );
  return entries;
}
