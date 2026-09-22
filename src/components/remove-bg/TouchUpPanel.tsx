"use client";
import { dropWork, getWork, undoStroke, workToBlob } from "@/lib/remove-bg/touch-up";
import { useRemoveBgStore, type RemovalItem } from "@/store/remove-bg-store";
import { RangeField } from "../ui/RangeField";

interface TouchUpPanelProps {
  item: RemovalItem;
}

const TOOLS = [
  { id: null, label: "Off" },
  { id: "restore" as const, label: "Restore" },
  { id: "erase" as const, label: "Erase" },
];

/** Brushes for fixing a cutout by hand: bring parts back or take more away. */
export function TouchUpPanel({ item }: TouchUpPanelProps) {
  const touchUp = useRemoveBgStore((s) => s.touchUp);
  const setTouchUp = useRemoveBgStore((s) => s.setTouchUp);
  const edited = Boolean(item.pristine);

  /** Puts the last stroke back and re-encodes the cutout. */
  const undo = async () => {
    const work = await getWork(item);
    if (!undoStroke(work)) return;
    const blob = await workToBlob(work);
    const store = useRemoveBgStore.getState();
    const current = store.items.find((candidate) => candidate.id === item.id);
    if (!current) return;
    store.updateResult(item.id, blob, URL.createObjectURL(blob), current.pristine ?? current.result);
    if (current.resultUrl) URL.revokeObjectURL(current.resultUrl);
  };

  /** Goes back to what the model made. */
  const reset = () => {
    const store = useRemoveBgStore.getState();
    const current = store.items.find((candidate) => candidate.id === item.id);
    if (!current?.pristine) return;
    dropWork(item.id);
    const url = URL.createObjectURL(current.pristine);
    store.updateResult(item.id, current.pristine, url, undefined);
    if (current.resultUrl) URL.revokeObjectURL(current.resultUrl);
  };

  return (
    <aside className="download touch-up-panel">
      <span className="label">Touch up</span>
      <div className="segmented" role="group" aria-label="Brush">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            className={`segmented__item ${touchUp.tool === tool.id ? "segmented__item--active" : ""}`}
            onClick={() => setTouchUp({ tool: tool.id })}
          >
            {tool.label}
          </button>
        ))}
      </div>
      {touchUp.tool ? (
        <>
          <RangeField label="Brush size" value={touchUp.size} min={4} max={400} suffix=" px" onCommit={(size) => setTouchUp({ size })} onPreview={(size) => setTouchUp({ size })} />
          <RangeField label="Softness" value={Math.round(touchUp.softness * 100)} min={0} max={100} suffix="%" onCommit={(value) => setTouchUp({ softness: value / 100 })} onPreview={(value) => setTouchUp({ softness: value / 100 })} />
          <p className="small muted">{touchUp.tool === "restore" ? "Paint to bring the original picture back." : "Paint to clear more away."}</p>
        </>
      ) : null}
      <div className="row">
        <button type="button" className="btn btn--sm" disabled={!edited} onClick={() => void undo()}>
          Undo stroke
        </button>
        <button type="button" className="btn btn--sm btn--ghost" disabled={!edited} onClick={reset}>
          Reset
        </button>
      </div>
    </aside>
  );
}
