"use client";
import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { selectPages } from "@/store/selectors";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Icon } from "../ui/Icon";
import { PageCard } from "./PageCard";

/** Strip of pages along the bottom of the editor. */
export function PagesStrip() {
  const pages = useProjectStore(selectPages);
  const currentPageId = useProjectStore((s) => s.currentPageId);
  const [deleting, setDeleting] = useState<string | null>(null);
  const store = useProjectStore.getState;

  const doomed = pages.find((page) => page.id === deleting);

  return (
    <footer className="pages">
      <div className="pages__list">
        {pages.map((page, index) => (
          <PageCard
            key={page.id}
            page={page}
            active={page.id === currentPageId}
            canDelete={pages.length > 1}
            canMoveLeft={index > 0}
            canMoveRight={index < pages.length - 1}
            onOpen={() => store().setCurrentPage(page.id)}
            onRename={(name) => store().renamePage(page.id, name)}
            onDuplicate={() => store().duplicatePage(page.id)}
            onDelete={() => setDeleting(page.id)}
            onMove={(delta) => store().movePage(page.id, delta)}
          />
        ))}
        <button type="button" className="page-card page-card--add" onClick={() => store().addPage()}>
          <Icon name="plus" size={16} />
          Add page
        </button>
      </div>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete page"
        message={`Delete "${doomed?.name ?? "this page"}" and everything on it? You can undo this with Ctrl+Z.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) store().deletePage(deleting);
          setDeleting(null);
        }}
      />
    </footer>
  );
}
