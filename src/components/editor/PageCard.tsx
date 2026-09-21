"use client";
import { useState } from "react";
import type { Page } from "@/model/types";
import { IconButton } from "../ui/IconButton";

interface PageCardProps {
  page: Page;
  index: number;
  active: boolean;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (delta: -1 | 1) => void;
}

/** One page in the strip along the bottom. Double click the name to rename. */
export function PageCard(props: PageCardProps) {
  const { page, index, active, canDelete, canMoveLeft, canMoveRight } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== page.name) props.onRename(draft);
    else setDraft(page.name);
  };

  return (
    <div className={`page-card ${active ? "page-card--active" : ""}`} onClick={props.onOpen} role="button" tabIndex={0}
      onKeyDown={(event) => event.key === "Enter" && props.onOpen()}>
      <span className="page-card__index">{index + 1}</span>
      {editing ? (
        <input
          className="input input--sm page-card__input"
          value={draft}
          autoFocus
          aria-label="Page name"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") { setDraft(page.name); setEditing(false); }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <span className="page-card__name" title="Double click to rename" onDoubleClick={() => { setDraft(page.name); setEditing(true); }}>
          {page.name}
        </span>
      )}
      <span className="small muted">{page.elements.length} {page.elements.length === 1 ? "item" : "items"}</span>
      <div className="page-card__actions" onClick={(event) => event.stopPropagation()}>
        <IconButton icon="chevronLeft" label="Move page left" size={14} disabled={!canMoveLeft} onClick={() => props.onMove(-1)} />
        <IconButton icon="duplicate" label="Duplicate page" size={14} onClick={props.onDuplicate} />
        <IconButton icon="trash" label="Delete page" size={14} disabled={!canDelete} onClick={props.onDelete} />
        <IconButton icon="chevronRight" label="Move page right" size={14} disabled={!canMoveRight} onClick={() => props.onMove(1)} />
      </div>
    </div>
  );
}
