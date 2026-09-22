"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { CubeLogo } from "../logo/CubeLogo";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Toggle } from "../ui/Toggle";
import { LeaveDialog } from "./dialogs/LeaveDialog";
import { ZoomControls } from "./ZoomControls";

interface TopBarProps {
  /** Saves the project. Resolves with false when the save failed. */
  onSave: () => Promise<boolean>;
  saving: boolean;
  autosave: boolean;
  onAutosaveChange: (enabled: boolean) => void;
}

/** Top bar: logo, project name, undo and redo, zoom, theme, save and export. */
export function TopBar({ onSave, saving, autosave, onAutosaveChange }: TopBarProps) {
  const router = useRouter();
  const name = useProjectStore((s) => s.project?.name ?? "");
  const dirty = useProjectStore((s) => s.dirty);
  const canUndo = useProjectStore((s) => s.history.past.length > 0);
  const canRedo = useProjectStore((s) => s.history.future.length > 0);
  const [draft, setDraft] = useState(name);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => setDraft(name), [name]);

  const commitName = () => {
    if (draft.trim()) useProjectStore.getState().renameProject(draft);
    else setDraft(name);
  };

  /** With autosave on the loader flushes on unmount. Otherwise ask first. */
  const goHome = () => {
    if (dirty && !autosave) setLeaving(true);
    else router.push("/");
  };

  return (
    <header className="topbar">
      <div className="row" style={{ gap: 12 }}>
        <button type="button" className="icon-btn" aria-label="Back to projects" title="Back to projects" onClick={goHome}>
          <CubeLogo size={26} />
        </button>
        <input
          className="topbar__name"
          value={draft}
          aria-label="Project name"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
        />
      </div>

      <div className="row topbar__centre">
        <IconButton className="topbar__history" icon="undo" label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useProjectStore.getState().undo()} />
        <IconButton className="topbar__history" icon="redo" label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useProjectStore.getState().redo()} />
        <ZoomControls />
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Toggle checked={autosave} onChange={onAutosaveChange} label="Autosave" />
        <ThemeToggle />
        <button
          type="button"
          className="btn"
          title={dirty ? "Unsaved changes (Ctrl+S)" : "All changes saved"}
          onClick={() => void onSave()}
          disabled={saving}
        >
          <Icon name="save" size={16} />
          {saving ? "Saving" : "Save"}
          {dirty ? <span className="save-dot" aria-label="Unsaved changes" /> : null}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => useEditorUiStore.getState().setExportOpen(true)}>
          <Icon name="export" size={16} />
          Export
        </button>
      </div>
      <LeaveDialog
        open={leaving}
        onCancel={() => setLeaving(false)}
        onLeave={() => router.push("/")}
        onSaveAndLeave={() => {
          void onSave().then((saved) => {
            if (saved) router.push("/");
            else setLeaving(false);
          });
        }}
      />
    </header>
  );
}
