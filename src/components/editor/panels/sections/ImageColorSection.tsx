"use client";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import type { ImageElement } from "@/model/types";
import { ColorPicker } from "../../../ui/ColorPicker";

interface ImageColorSectionProps {
  element: ImageElement;
}

/** One flat colour over a photo, with "None" in the picker to take it off again. */
export function ImageColorSection({ element }: ImageColorSectionProps) {
  const live = useLiveElementUpdate([element.id]);
  const tintPatch = (hex: string): Partial<ImageElement> => ({ tint: hex === "transparent" ? undefined : hex });

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Colour</span>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <ColorPicker
          label="Set colour"
          value={element.tint ?? "transparent"}
          allowTransparent
          onChange={(hex) => live.commit(tintPatch(hex))}
          onPreview={(hex) => live.preview(tintPatch(hex))}
        />
      </div>
    </section>
  );
}
