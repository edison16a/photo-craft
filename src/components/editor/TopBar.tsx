"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { CubeLogo } from "../logo/CubeLogo";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Toggle } from "../ui/Toggle";
import { ZoomControls } from "./ZoomControls";

interface TopBarProps {
  onSave: () => void;
  saving: boolean;
  autosave: boolean;
  onAutosaveChange: (enabled: boolean) => void;
}

/** Top bar: logo, project name, undo and redo, zoom, theme, save and export. */
export function TopBar({ onSave, saving, autosave, onAutosaveChange }: TopBarProps) {
  const name = useProjectStore((s) => s.project?.name ?? "");
  const size = useProjectStore((s) => (s.project ? `${s.project.width} x ${s.project.height}` : ""));
  const dirty = useProjectStore((s) => s.dirty);
  const canUndo = useProjectStore((s) => s.history.past.length > 0);
  const canRedo = useProjectStore((s) => s.history.future.length > 0);
  const [draft, setDraft] = useState(name);

  useEffect(() => setDraft(name), [name]);

  const commitName = () => {
    if (draft.trim()) useProjectStore.getState().renameProject(draft);
    else setDraft(name);
  };

  return (
    <header className="topbar">
      <div className="row" style={{ gap: 12 }}>
        <Link href="/" className="row" aria-label="Back to projects" style={{ gap: 8 }}>
          <CubeLogo size={26} />
        </Link>
        <input
          className="topbar__name"
          value={draft}
          aria-label="Project name"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
        />
        <span className="small muted">{size}</span>
        <span className="small muted">{dirty ? "Unsaved changes" : "All changes saved"}</span>
      </div>

      <div className="row">
        <IconButton icon="undo" label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useProjectStore.getState().undo()} />
        <IconButton icon="redo" label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useProjectStore.getState().redo()} />
        <ZoomControls />
      </div>

      <div className="row">
        <Toggle checked={autosave} onChange={onAutosaveChange} label="Autosave" />
        <ThemeToggle />
        <button type="button" className="btn" onClick={onSave} disabled={saving}>
          <Icon name="save" size={16} />
          {saving ? "Saving" : "Save"}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => useEditorUiStore.getState().setExportOpen(true)}>
          <Icon name="download" size={16} />
          Export
        </button>
      </div>
    </header>
  );
}
