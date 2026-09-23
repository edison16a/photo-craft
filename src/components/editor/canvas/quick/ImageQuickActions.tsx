"use client";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import { useRemoveBackground } from "@/hooks/use-remove-background";
import type { ImageElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { ColorPicker } from "../../../ui/ColorPicker";
import { IconButton } from "../../../ui/IconButton";

interface ImageQuickActionsProps {
  element: ImageElement;
}

/** The flat colour, background removal (or putting it back) and flips for an image. */
export function ImageQuickActions({ element }: ImageQuickActionsProps) {
  const { supported, busy, removed, label, run } = useRemoveBackground(element);
  const live = useLiveElementUpdate([element.id]);
  const store = useProjectStore.getState;
  const tintPatch = (hex: string): Partial<ImageElement> => ({ tint: hex === "transparent" ? undefined : hex });
  return (
    <>
      <ColorPicker
        compact
        label="Set colour"
        value={element.tint ?? "transparent"}
        allowTransparent
        onChange={(hex) => live.commit(tintPatch(hex))}
        onPreview={(hex) => live.preview(tintPatch(hex))}
      />
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
