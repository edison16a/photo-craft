"use client";
import type { CanvasElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { IconButton } from "../../../ui/IconButton";

interface CommonQuickActionsProps {
  elements: CanvasElement[];
}

/** Lock, duplicate and delete, shown for every selection. */
export function CommonQuickActions({ elements }: CommonQuickActionsProps) {
  const ids = elements.map((el) => el.id);
  const allLocked = elements.every((el) => el.locked);
  const store = useProjectStore.getState;
  return (
    <>
      <IconButton
        icon={allLocked ? "lock" : "unlock"}
        label={allLocked ? "Unlock" : "Lock position and size"}
        active={allLocked}
        onClick={() => store().setLocked(ids, !allLocked)}
      />
      <IconButton icon="duplicate" label="Duplicate (Ctrl+D)" onClick={() => store().duplicateElements(ids)} />
      <IconButton icon="trash" label="Delete" onClick={() => store().removeElements(ids)} />
    </>
  );
}
