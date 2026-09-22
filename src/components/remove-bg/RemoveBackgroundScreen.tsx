"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAddPictures } from "@/hooks/use-add-pictures";
import { usePictureDrop } from "@/hooks/use-picture-drop";
import { useRemovalQueue } from "@/hooks/use-removal-queue";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/image-loading";
import type { CutoutFormat } from "@/lib/remove-bg/export";
import { releaseItem } from "@/lib/remove-bg/files";
import { isTypingTarget } from "@/lib/typing-target";
import { useRemoveBgStore } from "@/store/remove-bg-store";
import { SiteHeader } from "../site/SiteHeader";
import { Toast } from "../ui/Toast";
import { CutoutPreview } from "./CutoutPreview";
import { DownloadPanel } from "./DownloadPanel";
import { DropZone } from "./DropZone";
import { ImageStrip } from "./ImageStrip";

/**
 * The remove background page. Drop, paste or pick pictures, watch them
 * get cut out one after another, flick between them with the strip or
 * the arrow keys, and download any of them at any size. Everything runs
 * in the browser and nothing is kept after leaving the page.
 */
export function RemoveBackgroundScreen() {
  useRemovalQueue();
  const items = useRemoveBgStore((s) => s.items);
  const selectedId = useRemoveBgStore((s) => s.selectedId);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const [format, setFormat] = useState<CutoutFormat>("png");
  const { addFiles, addUrls } = useAddPictures();
  const { onDragOver, onDrop } = usePictureDrop({ addFiles, addUrls });
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => inputRef.current?.click(), []);
  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const removeItem = useCallback((id: string) => {
    const store = useRemoveBgStore.getState();
    const item = store.items.find((candidate) => candidate.id === id);
    if (!item) return;
    store.remove(id);
    releaseItem(item);
  }, []);

  const clearAll = useCallback(() => {
    const store = useRemoveBgStore.getState();
    const gone = store.items;
    store.clear();
    gone.forEach(releaseItem);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const store = useRemoveBgStore.getState();
      if (event.key === "ArrowRight") store.selectNeighbour(1);
      else if (event.key === "ArrowLeft") store.selectNeighbour(-1);
      else if ((event.key === "Delete" || event.key === "Backspace") && store.selectedId) removeItem(store.selectedId);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeItem]);

  // Leaving the page frees every picture.
  useEffect(() => clearAll, [clearAll]);

  return (
    <main className="page-scroll remove-bg" onDragOver={onDragOver} onDrop={onDrop}>
      <SiteHeader wide />
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={onPick} aria-label="Choose pictures" />
      {items.length === 0 ? (
        <DropZone onPick={openPicker} />
      ) : (
        <section className="remove-bg__work">
          <ImageStrip items={items} selectedId={selectedId} onSelect={(id) => useRemoveBgStore.getState().select(id)} onRemove={removeItem} onAdd={openPicker} />
          <CutoutPreview key={selected?.id ?? "none"} item={selected} />
          <DownloadPanel key={`download-${selected?.id ?? "none"}`} item={selected} items={items} format={format} onFormatChange={setFormat} onClear={clearAll} />
        </section>
      )}
      <Toast />
    </main>
  );
}
