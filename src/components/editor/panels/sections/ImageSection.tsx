"use client";
import { useBackgroundRemovalStatus } from "@/hooks/use-background-removal-status";
import type { ImageElement } from "@/model/types";
import { removeImageBackground } from "@/services/background-removal";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";

interface ImageSectionProps {
  element: ImageElement;
}

/**
 * Image only tools. Background removal sends the picture to the server,
 * which runs the Python worker, and swaps in the cut out as one undo step.
 * The in flight flag lives in the editor UI store, keyed by element id, so
 * deselecting and reselecting the image mid run cannot start a second run.
 */
export function ImageSection({ element }: ImageSectionProps) {
  const status = useBackgroundRemovalStatus();
  const busy = useEditorUiStore((s) => s.busyImageIds.includes(element.id));

  const run = async () => {
    const { showToast, setImageBusy, busyImageIds } = useEditorUiStore.getState();
    if (busyImageIds.includes(element.id)) return;
    const pageId = useProjectStore.getState().currentPageId;
    setImageBusy(element.id, true);
    try {
      const result = await removeImageBackground(element.src);
      const store = useProjectStore.getState();
      const page = store.project?.pages.find((candidate) => candidate.id === pageId);
      const stillHere = store.currentPageId === pageId && page?.elements.some((el) => el.id === element.id);
      if (!stillHere) {
        showToast("The image is no longer on this page, so the cut out was not applied.", "error");
        return;
      }
      store.updateElement(element.id, { src: result.src, naturalWidth: result.width, naturalHeight: result.height });
      showToast("Background removed. Undo with Ctrl+Z to bring it back.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Background removal failed", "error");
    } finally {
      setImageBusy(element.id, false);
    }
  };

  const available = status?.available === true;

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Image</span>
      <button type="button" className="btn" disabled={busy || !available} onClick={() => void run()}>
        {busy ? "Removing background" : "Remove background"}
      </button>
      {status === undefined ? <p className="small muted">Checking whether background removal is set up.</p> : null}
      {status && !status.available ? (
        <p className="small muted">Background removal is off. {status.reason} See the README for the setup steps.</p>
      ) : null}
      {busy ? (
        <p className="small muted">This runs on the server. The first run downloads the model and can take a minute.</p>
      ) : null}
      {available && !busy ? (
        <p className="small muted">Cuts out the subject and makes the rest transparent. Runs on your own machine.</p>
      ) : null}
    </section>
  );
}
