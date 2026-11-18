"use client";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import type { ChromaKey, ImageElement } from "@/model/types";
import { toggleColorPick } from "@/store/chroma-key-actions";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { ColorPicker } from "../../../ui/ColorPicker";
import { Icon } from "../../../ui/Icon";
import { RangeField } from "../../../ui/RangeField";

interface ChromaKeyControlsProps {
  element: ImageElement;
}

/**
 * The chroma key block of the image section: the eyedropper, and once a
 * colour is set, that colour, its tolerance and softness and a button to
 * turn it off. Sliders preview live and record one undo step per drag.
 */
export function ChromaKeyControls({ element }: ChromaKeyControlsProps) {
  const picking = useEditorUiStore((s) => s.pickingColorFor === element.id);
  const live = useLiveElementUpdate([element.id]);
  const key = element.chromaKey;
  const keyPatch = (change: Partial<ChromaKey>): Partial<ImageElement> => (key ? { chromaKey: { ...key, ...change } } : {});

  return (
    <div className="stack" style={{ gap: 8, marginTop: 10 }}>
      <span className="label">Chroma key</span>
      <button
        type="button"
        className={`btn ${picking ? "btn--active" : ""}`}
        aria-pressed={picking}
        onClick={() => toggleColorPick(element.id)}
      >
        <Icon name="eyedropper" size={16} />
        Pick colour
      </button>
      {key ? (
        <>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <ColorPicker
              label="Colour"
              value={key.color}
              onChange={(hex) => live.commit(keyPatch({ color: hex }))}
              onPreview={(hex) => live.preview(keyPatch({ color: hex }))}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => live.commit({ chromaKey: undefined })}>
              Turn off
            </button>
          </div>
          <RangeField
            label="Tolerance"
            value={key.tolerance}
            min={0}
            max={100}
            onPreview={(value) => live.preview(keyPatch({ tolerance: value }))}
            onCommit={(value) => live.commit(keyPatch({ tolerance: value }))}
          />
          <RangeField
            label="Softness"
            value={key.softness}
            min={0}
            max={100}
            onPreview={(value) => live.preview(keyPatch({ softness: value }))}
            onCommit={(value) => live.commit(keyPatch({ softness: value }))}
          />
        </>
      ) : null}
    </div>
  );
}
