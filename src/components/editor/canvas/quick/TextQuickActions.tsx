"use client";
import type { TextAlign, TextElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { ColorPicker } from "../../../ui/ColorPicker";
import { IconButton } from "../../../ui/IconButton";
import { NumberField } from "../../../ui/NumberField";
import { FontPicker } from "../../panels/FontPicker";

interface TextQuickActionsProps {
  element: TextElement;
}

const NEXT_ALIGN: Record<TextAlign, TextAlign> = { left: "center", center: "right", right: "left" };
const ALIGN_ICON = { left: "textLeft", center: "textCenter", right: "textRight" } as const;

/** Font, size, style, colour and alignment for a text element. */
export function TextQuickActions({ element }: TextQuickActionsProps) {
  const update = (patch: Partial<TextElement>) => useProjectStore.getState().updateElement(element.id, patch);
  return (
    <>
      <FontPicker compact value={element.fontFamily} onChange={(fontFamily) => update({ fontFamily })} />
      <NumberField compact label="Font size" value={element.fontSize} min={1} max={2000} onCommit={(fontSize) => update({ fontSize })} />
      <IconButton icon="bold" label="Bold" active={element.fontWeight === "bold"} onClick={() => update({ fontWeight: element.fontWeight === "bold" ? "normal" : "bold" })} />
      <IconButton icon="italic" label="Italic" active={element.fontStyle === "italic"} onClick={() => update({ fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })} />
      <IconButton icon="underline" label="Underline" active={element.underline} onClick={() => update({ underline: !element.underline })} />
      <ColorPicker compact label="Text colour" value={element.fill} onChange={(fill) => update({ fill })} />
      <IconButton icon={ALIGN_ICON[element.align]} label={`Align ${element.align}, click to change`} onClick={() => update({ align: NEXT_ALIGN[element.align] })} />
      <span className="quick-toolbar__divider" />
    </>
  );
}
