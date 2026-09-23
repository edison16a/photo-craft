"use client";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import { ADJUST_FIELDS, DEFAULT_ADJUST, isDefaultAdjust, type ImageAdjust } from "@/lib/image-adjust";
import type { ImageElement } from "@/model/types";
import { ColorPicker } from "../../../ui/ColorPicker";
import { RangeField } from "../../../ui/RangeField";

interface ImageColorSectionProps {
  element: ImageElement;
}

/**
 * Colour for a photo: one flat colour over everything, or sliders that
 * shift brightness, contrast, saturation and hue. Sliders show their
 * effect while dragged and record one undo step when let go.
 */
export function ImageColorSection({ element }: ImageColorSectionProps) {
  const live = useLiveElementUpdate([element.id]);
  const adjust = element.adjust ?? DEFAULT_ADJUST;
  const changed = Boolean(element.tint) || !isDefaultAdjust(element.adjust);

  const withField = (key: keyof ImageAdjust, value: number): Partial<ImageElement> => {
    const next = { ...adjust, [key]: value };
    return { adjust: isDefaultAdjust(next) ? undefined : next };
  };
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
      {ADJUST_FIELDS.map((field) => (
        <RangeField
          key={field.key}
          label={field.label}
          value={adjust[field.key]}
          min={field.min}
          max={field.max}
          suffix={field.suffix}
          onPreview={(value) => live.preview(withField(field.key, value))}
          onCommit={(value) => live.commit(withField(field.key, value))}
        />
      ))}
      {changed ? (
        <div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => live.commit({ tint: undefined, adjust: undefined })}>
            Reset colour
          </button>
        </div>
      ) : null}
    </section>
  );
}
