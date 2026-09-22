"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProjectLoader } from "@/hooks/use-project-loader";
import { useSaveProject } from "@/hooks/use-save-project";
import { useSettings } from "@/hooks/use-settings";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { zoomIn, zoomOut, zoomToFit } from "@/store/viewport-actions";
import { Toast } from "../ui/Toast";
import { ExportDialog } from "./dialogs/ExportDialog";
import { PagesStrip } from "./PagesStrip";
import { RightPanel } from "./panels/RightPanel";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";

/** Konva needs the DOM, so the stage is only ever rendered in the browser. */
const CanvasStage = dynamic(() => import("./canvas/CanvasStage").then((m) => m.CanvasStage), {
  ssr: false,
  loading: () => <div className="workspace" />,
});

interface EditorProps {
  projectId: string;
}

/** The full screen editor: top bar, tool rail, canvas, side panel and page strip. */
export function Editor({ projectId }: EditorProps) {
  const { status, error } = useProjectLoader(projectId);
  const { save, saving } = useSaveProject();
  const { settings, updateSettings } = useSettings();
  const exportOpen = useEditorUiStore((s) => s.exportOpen);

  useAutosave(settings.autosave && status === "ready", save);
  const shortcuts = useMemo(() => ({ save: () => void save(), zoomIn, zoomOut, zoomToFit }), [save]);
  useKeyboardShortcuts(shortcuts);

  if (status === "missing" || status === "error") {
    return (
      <main className="page-scroll centered">
        <div className="stack" style={{ alignItems: "center" }}>
          <h1>{status === "missing" ? "Project not found" : "Could not open the project"}</h1>
          <p className="muted">{error ?? "It may have been deleted from this browser."}</p>
          <Link href="/" className="btn btn--primary">
            Back to projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="editor">
      <TopBar
        onSave={save}
        saving={saving}
        autosave={settings.autosave}
        onAutosaveChange={(autosave) => updateSettings({ autosave })}
      />
      <ToolRail />
      {status === "ready" ? <CanvasStage /> : <div className="workspace centered muted">Opening project</div>}
      <RightPanel />
      <PagesStrip />
      <Toast />
      <ExportDialog open={exportOpen} onClose={() => useEditorUiStore.getState().setExportOpen(false)} />
    </div>
  );
}
