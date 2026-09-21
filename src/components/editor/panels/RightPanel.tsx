"use client";
import { useEffect } from "react";
import { useEditorUiStore, type PanelKind } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { ElementsSearchPanel } from "./ElementsSearchPanel";
import { PagePanel } from "./PagePanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { ShapesPanel } from "./ShapesPanel";
import { TextPanel } from "./TextPanel";
import { UploadPanel } from "./UploadPanel";

const TITLES: Record<PanelKind, string> = {
  properties: "Selection",
  page: "Page",
  text: "Text",
  shapes: "Shapes",
  upload: "Upload",
  elements: "Elements",
};

/**
 * The panel on the right. Selecting something shows its properties.
 * Picking a tool shows that tool's panel. With nothing selected and the
 * pointer tool active it shows the page settings.
 */
export function RightPanel() {
  const panel = useEditorUiStore((s) => s.panel);
  const openPanel = useEditorUiStore((s) => s.openPanel);
  const hasSelection = useProjectStore((s) => s.selectedIds.length > 0);

  useEffect(() => {
    const ui = useEditorUiStore.getState();
    if (hasSelection && ui.tool === "select") ui.openPanel("properties");
    if (!hasSelection && ui.panel === "properties") ui.openPanel("page");
  }, [hasSelection]);

  const shown: PanelKind = panel === "properties" && !hasSelection ? "page" : panel;

  return (
    <aside className="panel" aria-label={TITLES[shown]}>
      <div className="panel__header">
        <h2 className="panel__title">{TITLES[shown]}</h2>
        {shown !== "page" && shown !== "properties" ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => openPanel(hasSelection ? "properties" : "page")}>
            Done
          </button>
        ) : null}
      </div>
      <div className="panel__body">
        {shown === "properties" ? <PropertiesPanel /> : null}
        {shown === "page" ? <PagePanel /> : null}
        {shown === "text" ? <TextPanel /> : null}
        {shown === "shapes" ? <ShapesPanel /> : null}
        {shown === "upload" ? <UploadPanel /> : null}
        {shown === "elements" ? <ElementsSearchPanel /> : null}
      </div>
    </aside>
  );
}
