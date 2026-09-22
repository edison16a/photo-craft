"use client";
import Link from "next/link";
import { useState } from "react";
import { useProjectList } from "@/hooks/use-project-list";
import type { ProjectSummary } from "@/model/types";
import { SiteHeader } from "../site/SiteHeader";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Icon } from "../ui/Icon";
import { PromptDialog } from "../ui/PromptDialog";
import { ProjectCard } from "./ProjectCard";

/** Home page: your projects and a tile that starts a new one. */
export function HomeScreen() {
  const { projects, loading, error, rename, duplicate, remove } = useProjectList();
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);

  return (
    <main className="page-scroll home">
      <SiteHeader />
      <section className="home__projects">
        {error ? <p className="muted">{error}</p> : null}
        <div className="project-grid">
          {loading
            ? null
            : projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onRename={() => setRenaming(project)}
                  onDuplicate={() => void duplicate(project.id)}
                  onDelete={() => setDeleting(project)}
                />
              ))}
          {/* Last in the grid, so it follows the projects instead of leading them. */}
          <Link href="/new" className="project-card project-card--new" aria-label="New project">
            <Icon name="plus" size={28} />
            <span>New project</span>
          </Link>
        </div>
      </section>

      <PromptDialog
        open={renaming !== null}
        title="Rename project"
        label="Project name"
        initialValue={renaming?.name ?? ""}
        onCancel={() => setRenaming(null)}
        onSubmit={(name) => {
          if (renaming) void rename(renaming.id, name);
          setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete project"
        message={`Delete "${deleting?.name}"? This removes it from this browser and cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove(deleting.id);
          setDeleting(null);
        }}
      />
    </main>
  );
}
