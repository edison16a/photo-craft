"use client";
import { useEffect, useRef, useState } from "react";
import type { CanvasElement } from "@/model/types";

interface ScaleSliderProps {
  element: CanvasElement;
  onPreview: (patch: Partial<CanvasElement>) => void;
  onCommit: (patch: Partial<CanvasElement>) => void;
}

/** Sizes the slider remembers as 100 percent: the element when it was selected. */
interface ScaleBase {
  width: number;
  height: number;
  centreX: number;
  centreY: number;
  fontSize: number;
  letterSpacing: number;
}

function baseFrom(element: CanvasElement): ScaleBase {
  return {
    width: element.width,
    height: element.height,
    centreX: element.x + element.width / 2,
    centreY: element.y + element.height / 2,
    fontSize: element.type === "text" ? element.fontSize : 0,
    letterSpacing: element.type === "text" ? element.letterSpacing : 0,
  };
}

/** The patch that scales the element around its centre by a factor. */
function scaledPatch(element: CanvasElement, base: ScaleBase, factor: number): Partial<CanvasElement> {
  const width = Math.max(4, Math.round(base.width * factor));
  const height = Math.max(4, Math.round(base.height * factor));
  const patch: Partial<CanvasElement> & { fontSize?: number; letterSpacing?: number } = {
    width,
    x: Math.round((base.centreX - width / 2) * 100) / 100,
    y: Math.round((base.centreY - height / 2) * 100) / 100,
  };
  if (element.type === "text") {
    patch.fontSize = Math.max(1, Math.round(base.fontSize * factor));
    patch.letterSpacing = Math.round(base.letterSpacing * factor * 100) / 100;
  } else {
    patch.height = height;
  }
  return patch;
}

/**
 * Scales the selected element around its centre. 100 percent is the size
 * the element had when it was selected, so sliding back to 100 undoes the
 * change. Updates the canvas while dragging and records one undo step.
 */
export function ScaleSlider({ element, onPreview, onCommit }: ScaleSliderProps) {
  const base = useRef(baseFrom(element));
  const percent = Math.round((element.width / base.current.width) * 100);
  const [draft, setDraft] = useState(percent);

  useEffect(() => setDraft(percent), [percent]);

  const commit = () => onCommit(scaledPatch(element, base.current, draft / 100));

  return (
    <label className="field">
      <span className="field__label">Scale {draft}%</span>
      <input
        type="range"
        className="slider"
        min={10}
        max={400}
        value={Math.min(400, Math.max(10, draft))}
        disabled={element.locked}
        onChange={(event) => {
          const next = Number(event.target.value);
          setDraft(next);
          onPreview(scaledPatch(element, base.current, next / 100));
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  );
}
