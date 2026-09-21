"use client";
import { useEditorUiStore } from "@/store/editor-ui-store";

/** Shows the current toast message from the UI store, if any. */
export function Toast() {
  const toast = useEditorUiStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind === "error" ? "toast--error" : ""}`} role="status">
      {toast.message}
    </div>
  );
}
