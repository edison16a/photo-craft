"use client";
import { useEffect, useState } from "react";
import { downloadBlob } from "@/lib/download";
import {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_FORMATS,
  SCALE_PRESETS,
  formatOption,
  isScaleTooLarge,
  outputSize,
  scaleForWidth,
  type ExportOptions,
} from "@/lib/export/export-options";
import { exportPages } from "@/lib/export/export-raster";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { Modal } from "../../ui/Modal";
import { Toggle } from "../../ui/Toggle";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Format, size, quality, transparency and which pages to export. */
export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const project = useProjectStore((s) => s.project);
  const currentPageId = useProjectStore((s) => s.currentPageId);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pageTransparent = project?.pages.find((p) => p.id === currentPageId)?.background === "transparent";

  // Start from what the page says each time the dialog opens.
  useEffect(() => {
    if (open) setOptions((current) => ({ ...current, transparent: pageTransparent }));
  }, [open, pageTransparent]);

  if (!project) return null;
  const format = formatOption(options.format);
  const size = outputSize(project, options.scale);
  const tooLarge = isScaleTooLarge(project, options.scale);
  const set = (patch: Partial<ExportOptions>) => setOptions((current) => ({ ...current, ...patch }));

  const run = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const pages = options.pages === "all" ? project.pages : project.pages.filter((p) => p.id === currentPageId);
      const result = await exportPages(project, pages, options);
      downloadBlob(result.blob, result.filename);
      useEditorUiStore.getState().showToast(`Exported ${result.filename}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Export" onClose={onClose} width={480}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="field">
          <span className="field__label">Format</span>
          <div className="segmented">
            {EXPORT_FORMATS.map((item) => (
              <button key={item.id} type="button" className={`segmented__item ${options.format === item.id ? "segmented__item--active" : ""}`} onClick={() => set({ format: item.id })}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Size</span>
          <div className="row row--wrap">
            {SCALE_PRESETS.map((scale) => (
              <button key={scale} type="button" className={`btn btn--sm ${options.scale === scale ? "btn--active" : ""}`} onClick={() => set({ scale })}>
                {scale}x
              </button>
            ))}
            <label className="row" style={{ gap: 4 }}>
              <span className="small muted">Width</span>
              <input className="input input--sm" style={{ width: 90 }} type="number" min={1} value={size.width}
                onChange={(event) => set({ scale: scaleForWidth(project, Math.max(1, Number(event.target.value))) })} />
            </label>
          </div>
          <span className="small muted">
            Output {size.width} x {size.height} px{options.format === "pdf" ? ", rendered at this size into the PDF" : ""}.
          </span>
          {tooLarge ? <span className="small" style={{ color: "var(--danger)" }}>Too large to render in a browser. Pick a smaller size.</span> : null}
        </div>

        {format.supportsTransparency ? (
          <Toggle checked={options.transparent} onChange={(transparent) => set({ transparent })} label="Transparent background" />
        ) : null}

        {format.supportsQuality ? (
          <label className="field">
            <span className="field__label">Quality {Math.round(options.quality * 100)}%</span>
            <input type="range" className="slider" min={10} max={100} value={Math.round(options.quality * 100)} onChange={(event) => set({ quality: Number(event.target.value) / 100 })} />
          </label>
        ) : null}

        {project.pages.length > 1 ? (
          <div className="field">
            <span className="field__label">Pages</span>
            <div className="segmented">
              <button type="button" className={`segmented__item ${options.pages === "current" ? "segmented__item--active" : ""}`} onClick={() => set({ pages: "current" })}>Current page</button>
              <button type="button" className={`segmented__item ${options.pages === "all" ? "segmented__item--active" : ""}`} onClick={() => set({ pages: "all" })}>
                All {project.pages.length} pages{options.format === "pdf" ? "" : " (ZIP)"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="small" style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={busy || tooLarge} onClick={() => void run()}>
            {busy ? "Exporting" : `Export ${format.label}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
