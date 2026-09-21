"use client";
import Link from "next/link";
import { useState } from "react";
import { useProjectList } from "@/hooks/use-project-list";
import type { ProjectSummary } from "@/model/types";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PromptDialog } from "../ui/PromptDialog";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Hero } from "./Hero";
import { ProjectCard } from "./ProjectCard";

/** Home page: the pitch plus every project saved in this browser. */
export function HomeScreen() {
  const { projects, loading, error, rename, duplicate, remove } = useProjectList();
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);

  return (
    <main className="page-scroll home">
      <header className="home__bar">
        <span className="small muted">Free, open source, runs in your browser</span>
        <ThemeToggle />
      </header>
      <Hero />
      <section className="home__projects">
        <div className="row row--between" style={{ marginBottom: 12 }}>
          <h2 className="home__heading">Your projects</h2>
          <Link href="/new" className="btn btn--sm">
            New project
          </Link>
        </div>
        {error ? <p className="muted">{error}</p> : null}
        {!loading && projects.length === 0 && !error ? (
          <p className="muted">Nothing here yet. Create a project and it will show up once you save it.</p>
        ) : null}
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onRename={() => setRenaming(project)}
              onDuplicate={() => void duplicate(project.id)}
              onDelete={() => setDeleting(project)}
            />
          ))}
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
