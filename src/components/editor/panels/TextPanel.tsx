"use client";
import { useAddElement } from "@/hooks/use-add-element";
import { useProjectStore } from "@/store/project-store";

/** Quick ways to add text at three sizes. */
export function TextPanel() {
  const { addText } = useAddElement();
  const width = useProjectStore((s) => s.project?.width ?? 1000);
  const base = Math.round(width / 16);

  return (
    <div className="stack">
      <button type="button" className="btn btn--block text-sample text-sample--heading"
        onClick={() => void addText({ text: "Add a heading", fontSize: Math.round(base * 1.3), fontWeight: "bold" })}>
        Add a heading
      </button>
      <button type="button" className="btn btn--block text-sample text-sample--subheading"
        onClick={() => void addText({ text: "Add a subheading", fontSize: Math.round(base * 0.8), fontWeight: "bold" })}>
        Add a subheading
      </button>
      <button type="button" className="btn btn--block text-sample"
        onClick={() => void addText({ text: "Add a little bit of body text", fontSize: Math.round(base * 0.5) })}>
        Add body text
      </button>
      <p className="small muted">
        Or click anywhere on the page with the text tool to place a text box there. Double click any text to edit it.
      </p>
    </div>
  );
}
