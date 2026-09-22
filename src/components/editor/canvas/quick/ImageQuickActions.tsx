"use client";
import { useRemoveBackground } from "@/hooks/use-remove-background";
import type { ImageElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { IconButton } from "../../../ui/IconButton";

interface ImageQuickActionsProps {
  element: ImageElement;
}

/** Background removal (or putting it back) and flips for an image. */
export function ImageQuickActions({ element }: ImageQuickActionsProps) {
  const { supported, busy, removed, label, run } = useRemoveBackground(element);
  const store = useProjectStore.getState;
  return (
    <>
      <button
        type="button"
        className="btn btn--sm"
        disabled={busy || !supported}
        title={supported ? (removed ? "Put the background back" : "Cut out the subject and make the rest transparent") : "This browser cannot run the background remover"}
        onClick={() => void run()}
      >
        {label}
      </button>
      <IconButton icon="flipH" label="Flip horizontally" onClick={() => store().flip([element.id], "x")} />
      <IconButton icon="flipV" label="Flip vertically" onClick={() => store().flip([element.id], "y")} />
      <span className="quick-toolbar__divider" />
    </>
  );
}
