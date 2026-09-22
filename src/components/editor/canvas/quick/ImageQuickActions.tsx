"use client";
import type { ImageElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { IconButton } from "../../../ui/IconButton";

interface ImageQuickActionsProps {
  element: ImageElement;
}

/** Flips for an image. */
export function ImageQuickActions({ element }: ImageQuickActionsProps) {
  const store = useProjectStore.getState;
  return (
    <>
      <IconButton icon="flipH" label="Flip horizontally" onClick={() => store().flip([element.id], "x")} />
      <IconButton icon="flipV" label="Flip vertically" onClick={() => store().flip([element.id], "y")} />
      <span className="quick-toolbar__divider" />
    </>
  );
}
