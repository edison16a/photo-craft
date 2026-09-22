"use client";
import { useRemoveBackground } from "@/hooks/use-remove-background";
import type { ImageElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { IconButton } from "../../../ui/IconButton";

interface ImageQuickActionsProps {
  element: ImageElement;
}

/** Background removal and flips for an image. */
export function ImageQuickActions({ element }: ImageQuickActionsProps) {
  const { supported, busy, progress, run } = useRemoveBackground(element);
  const store = useProjectStore.getState;
  return (
    <>
      <button
        type="button"
        className="btn btn--sm"
        disabled={busy || !supported}
        title={supported ? "Cut out the subject and make the rest transparent" : "This browser cannot run the background remover"}
        onClick={() => void run()}
      >
        {busy ? (progress ?? "Removing") : "Remove background"}
      </button>
      <IconButton icon="flipH" label="Flip horizontally" onClick={() => store().flip([element.id], "x")} />
      <IconButton icon="flipV" label="Flip vertically" onClick={() => store().flip([element.id], "y")} />
      <span className="quick-toolbar__divider" />
    </>
  );
}
