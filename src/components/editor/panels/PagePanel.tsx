"use client";
import { useEffect, useState } from "react";
import { PROJECT_SIZE_LIMITS } from "@/data/presets";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentPage } from "@/store/selectors";
import { zoomToFit } from "@/store/viewport-actions";
import { ColorPicker } from "../../ui/ColorPicker";
import { NumberField } from "../../ui/NumberField";
import { Toggle } from "../../ui/Toggle";

/** Page name, background and the project's pixel size. */
export function PagePanel() {
  const page = useProjectStore(selectCurrentPage);
  const project = useProjectStore((s) => s.project);
  const [name, setName] = useState(page?.name ?? "");

  useEffect(() => setName(page?.name ?? ""), [page?.id, page?.name]);

  if (!page || !project) return null;
  const store = useProjectStore.getState;
  const transparent = page.background === "transparent";

  const resize = (width: number, height: number) => {
    store().resizeProject(width, height);
    zoomToFit();
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <label className="field">
        <span className="field__label">Page name</span>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== page.name) store().renamePage(page.id, trimmed);
            else setName(page.name);
          }}
          onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
        />
      </label>

      <div className="stack" style={{ gap: 8 }}>
        <ColorPicker
          label="Background"
          value={transparent ? "#ffffff" : page.background}
          onChange={(hex) => store().setPageBackground(page.id, hex)}
        />
        <Toggle
          checked={transparent}
          label="Transparent background"
          onChange={(on) => store().setPageBackground(page.id, on ? "transparent" : "#ffffff")}
        />
        <p className="small muted">
          A transparent page exports with no background in PNG and WebP.
        </p>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Canvas size</span>
        <div className="row">
          <NumberField label="Width" value={project.width} min={PROJECT_SIZE_LIMITS.min} max={PROJECT_SIZE_LIMITS.max} suffix="px" onCommit={(w) => resize(w, project.height)} />
          <NumberField label="Height" value={project.height} min={PROJECT_SIZE_LIMITS.min} max={PROJECT_SIZE_LIMITS.max} suffix="px" onCommit={(h) => resize(project.width, h)} />
        </div>
        <p className="small muted">Changing the size applies to every page. Elements keep their positions.</p>
      </div>

      <div className="row row--wrap">
        <button type="button" className="btn btn--sm" onClick={() => store().duplicatePage(page.id)}>
          Duplicate page
        </button>
        <button type="button" className="btn btn--sm" onClick={() => store().addPage()}>
          Add page
        </button>
      </div>

      <p className="small muted">
        Tip: drag on empty space to select several items, hold Shift to add to the selection. Double click text to edit it.
      </p>
    </div>
  );
}
