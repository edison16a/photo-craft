"use client";
import { describeRemovalEngine, useRemovalProgressStore } from "@/store/removal-progress-store";
import type { RemovalItem, RemovalStatus } from "@/store/remove-bg-store";
import { Icon } from "../ui/Icon";

interface ImageStripProps {
  items: RemovalItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

/** Badge text per status. Finished pictures need none. */
const STATUS_LABEL: Record<RemovalStatus, string | null> = {
  queued: "Waiting",
  working: "Working",
  done: null,
  failed: "Failed",
};

/** Thumbnails of every picture on the page, a way to add more, and a note on what does the work. */
export function ImageStrip({ items, selectedId, onSelect, onRemove, onAdd }: ImageStripProps) {
  const backend = useRemovalProgressStore((s) => s.backend);
  const engine = describeRemovalEngine({ backend });
  return (
    <aside className="strip" aria-label="Pictures">
      <ul className="strip__list">
        {items.map((item) => {
          const active = item.id === selectedId;
          const label = STATUS_LABEL[item.status];
          return (
            <li key={item.id} className={`strip__item ${active ? "strip__item--active" : ""} ${item.status === "failed" ? "strip__item--failed" : ""}`}>
              <button
                type="button"
                className="strip__pick checker"
                aria-label={`${item.name}, ${item.status}`}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(item.id)}
              >
                {/* Object URLs cannot go through next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.resultUrl ?? item.originalUrl} alt="" draggable={false} />
                {label ? <span className={`strip__status strip__status--${item.status}`}>{label}</span> : null}
              </button>
              <button type="button" className="strip__remove" aria-label={`Remove ${item.name}`} title="Remove" onClick={() => onRemove(item.id)}>
                <Icon name="close" size={14} />
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="strip__add" onClick={onAdd}>
        <Icon name="upload" size={18} />
        Upload Photo
      </button>
      {engine ? (
        <p className="small muted strip__engine" data-backend={backend ?? undefined}>
          {engine}
        </p>
      ) : null}
    </aside>
  );
}
