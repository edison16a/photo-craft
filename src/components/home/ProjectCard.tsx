"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProjectSummary } from "@/model/types";
import { IconButton } from "../ui/IconButton";

interface ProjectCardProps {
  project: ProjectSummary;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** One saved project on the home grid. */
export function ProjectCard({ project, onRename, onDuplicate, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const href = `/editor/${project.id}`;

  // Close on an outside click or Escape, not only when the pointer leaves.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <article className="project-card">
      <Link href={href} className="project-card__thumb" aria-label={`Open ${project.name}`}>
        {project.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail} alt="" />
        ) : (
          <span className="muted small">No preview yet</span>
        )}
      </Link>
      <div className="project-card__body">
        <div className="grow">
          <Link href={href} className="project-card__name">
            {project.name}
          </Link>
          <div className="small muted">
            {project.width} x {project.height}, {project.pageCount} {project.pageCount === 1 ? "page" : "pages"}, {formatDate(project.updatedAt)}
          </div>
        </div>
        <div className="project-card__menu" ref={menuRef}>
          <IconButton icon="more" label="Project actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
          {menuOpen ? (
            <div className="menu" role="menu">
              <Link href={href} className="menu__item">
                Open
              </Link>
              <button type="button" className="menu__item" onClick={() => { setMenuOpen(false); onRename(); }}>
                Rename
              </button>
              <button type="button" className="menu__item" onClick={() => { setMenuOpen(false); onDuplicate(); }}>
                Duplicate
              </button>
              <button type="button" className="menu__item menu__item--danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
