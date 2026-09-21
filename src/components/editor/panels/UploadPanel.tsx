"use client";
import { useRef, useState, type DragEvent } from "react";
import { useAddElement } from "@/hooks/use-add-element";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/image-loading";
import { extractDropPayload } from "@/lib/drop-payload";

/** Import images from disk, by drag and drop, or from a pasted link. */
export function UploadPanel() {
  const { addImageFile, addImageUrl } = useAddElement();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [over, setOver] = useState(false);

  const onFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    for (const file of Array.from(files)) void addImageFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    const payload = extractDropPayload(event.dataTransfer);
    onFiles(payload.files);
    if (payload.files.length === 0 && payload.urls[0]) void addImageUrl(payload.urls[0]);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={(event) => onFiles(event.target.files)} />
      <button type="button" className="btn btn--primary btn--block" onClick={() => inputRef.current?.click()}>
        Choose images
      </button>
      <div
        className={`dropzone ${over ? "dropzone--over" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        Drop images here or anywhere on the canvas. You can also paste an image with Ctrl+V.
      </div>
      <form className="stack" style={{ gap: 6 }} onSubmit={(event) => { event.preventDefault(); if (url.trim()) { void addImageUrl(url.trim()); setUrl(""); } }}>
        <label className="field">
          <span className="field__label">Image link</span>
          <input className="input" placeholder="https://..." value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <button type="submit" className="btn btn--sm" disabled={!url.trim()}>Add from link</button>
      </form>
      <p className="small muted">
        Images are stored inside the project in this browser. Very large images are scaled down to 4096 px on the longest side.
      </p>
    </div>
  );
}
