"use client";
import { useEffect, useState } from "react";
import type { TextAlign, TextElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { ColorPicker } from "../../../ui/ColorPicker";
import { IconButton } from "../../../ui/IconButton";
import { NumberField } from "../../../ui/NumberField";
import { FontPicker } from "../FontPicker";

interface TextSectionProps {
  element: TextElement;
}

/** Content, font, size, style, alignment, colour and spacing for text. */
export function TextSection({ element }: TextSectionProps) {
  const update = (patch: Partial<TextElement>) => useProjectStore.getState().updateElement(element.id, patch);
  const [draft, setDraft] = useState(element.text);

  useEffect(() => setDraft(element.text), [element.id, element.text]);

  const aligns: { id: TextAlign; icon: "textLeft" | "textCenter" | "textRight" }[] = [
    { id: "left", icon: "textLeft" },
    { id: "center", icon: "textCenter" },
    { id: "right", icon: "textRight" },
  ];

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Text</span>
      <textarea
        className="textarea"
        value={draft}
        aria-label="Text content"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== element.text && draft.trim() && update({ text: draft })}
      />
      <FontPicker value={element.fontFamily} onChange={(fontFamily) => update({ fontFamily })} />
      <div className="row" style={{ alignItems: "flex-end" }}>
        <NumberField label="Size" value={element.fontSize} min={1} max={2000} suffix="px" onCommit={(fontSize) => update({ fontSize })} />
        <ColorPicker label="Colour" value={element.fill} onChange={(fill) => update({ fill })} />
      </div>
      <div className="row row--wrap">
        <IconButton icon="bold" label="Bold" active={element.fontWeight === "bold"} onClick={() => update({ fontWeight: element.fontWeight === "bold" ? "normal" : "bold" })} />
        <IconButton icon="italic" label="Italic" active={element.fontStyle === "italic"} onClick={() => update({ fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })} />
        <IconButton icon="underline" label="Underline" active={element.underline} onClick={() => update({ underline: !element.underline })} />
        <span className="panel__divider" />
        {aligns.map((item) => (
          <IconButton key={item.id} icon={item.icon} label={`Align ${item.id}`} active={element.align === item.id} onClick={() => update({ align: item.id })} />
        ))}
      </div>
      <div className="row">
        <NumberField label="Line height" value={element.lineHeight} min={0.5} max={4} step={0.1} decimals={2} onCommit={(lineHeight) => update({ lineHeight })} />
        <NumberField label="Letter spacing" value={element.letterSpacing} min={-20} max={100} suffix="px" onCommit={(letterSpacing) => update({ letterSpacing })} />
      </div>
    </section>
  );
}
