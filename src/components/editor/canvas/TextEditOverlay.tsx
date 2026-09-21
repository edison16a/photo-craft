"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TextElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";

/**
 * Picks the text element being edited and mounts a fresh editor box for it.
 * The key makes sure each editing session starts with the element's text
 * selected, ready to be replaced.
 */
export function TextEditOverlay() {
  const editingId = useEditorUiStore((s) => s.editingTextId);
  const element = useProjectStore((s) =>
    selectCurrentElements(s).find((el): el is TextElement => el.id === editingId && el.type === "text"),
  );
  if (!element) return null;
  return <TextEditBox key={element.id} element={element} />;
}

interface TextEditBoxProps {
  element: TextElement;
}

/**
 * A textarea laid exactly over the text element, matching its font, size,
 * rotation and zoom. Enter adds a line, Escape or clicking away finishes.
 * The change is stored as one undo step when editing ends.
 */
function TextEditBox({ element }: TextEditBoxProps) {
  const zoom = useEditorUiStore((s) => s.zoom);
  const pan = useEditorUiStore((s) => s.pan);
  const [draft, setDraft] = useState(element.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.focus();
    area.select();
  }, []);

  useEffect(() => {
    const area = ref.current;
    if (area) {
      area.style.height = "auto";
      area.style.height = `${area.scrollHeight}px`;
    }
  }, [draft, zoom, element.fontSize, element.width]);

  const finish = () => {
    const text = draft.trim().length === 0 ? element.text : draft;
    if (text !== element.text) useProjectStore.getState().updateElement(element.id, { text });
    useEditorUiStore.getState().setEditingText(null);
  };

  const style: CSSProperties = {
    position: "absolute",
    left: pan.x + element.x * zoom,
    top: pan.y + element.y * zoom,
    width: element.width * zoom,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: "top left",
    fontFamily: `"${element.fontFamily}", Arial, sans-serif`,
    fontSize: element.fontSize * zoom,
    fontWeight: element.fontWeight === "bold" ? 700 : 400,
    fontStyle: element.fontStyle,
    textDecoration: element.underline ? "underline" : "none",
    lineHeight: element.lineHeight,
    letterSpacing: element.letterSpacing * zoom,
    textAlign: element.align,
    color: element.fill,
    opacity: element.opacity,
  };

  return (
    <textarea
      ref={ref}
      className="text-edit"
      style={style}
      value={draft}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish();
        }
      }}
      onMouseDown={(event) => event.stopPropagation()}
    />
  );
}
