"use client";
import { cornersNeeded, GRID_SIZES } from "@/lib/drawing";
import { cancelDrawing, canFinishDrawing, finishDrawing, undoDrawPoint } from "@/store/drawing-actions";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { Toggle } from "../../ui/Toggle";

/** Options and buttons for the draw tool. The drawing itself happens on the canvas. */
export function DrawPanel() {
  const options = useEditorUiStore((s) => s.drawOptions);
  const points = useEditorUiStore((s) => s.drawPoints);
  const setOptions = useEditorUiStore((s) => s.setDrawOptions);
  const corners = points.length / 2;
  const needed = cornersNeeded(options);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Grid</span>
        <div className="segmented" role="group" aria-label="Grid spacing">
          {GRID_SIZES.map((size) => (
            <button key={size} type="button" className={`segmented__item ${options.grid === size ? "segmented__item--active" : ""}`} onClick={() => setOptions({ grid: size })}>
              {size} px
            </button>
          ))}
        </div>
        <Toggle checked={options.closed} onChange={(closed) => setOptions({ closed })} label="Close the shape" />
        <Toggle checked={options.smooth} onChange={(smooth) => setOptions({ smooth })} label="Smooth corners" />
      </div>
      <p className="small muted">Click or drag along the grid. Draw back to the start to finish.</p>
      <span className="small muted">
        {corners} {corners === 1 ? "corner" : "corners"} placed{corners < needed ? `, ${needed - corners} more needed` : ""}.
      </span>
      <div className="row">
        <button type="button" className="btn btn--primary grow" disabled={!canFinishDrawing() || corners < needed} onClick={() => finishDrawing()}>
          Finish shape
        </button>
        <button type="button" className="btn" disabled={corners === 0} onClick={undoDrawPoint} title="Backspace">
          Undo
        </button>
        <button type="button" className="btn btn--ghost" disabled={corners === 0} onClick={cancelDrawing} title="Escape">
          Start over
        </button>
      </div>
    </div>
  );
}
