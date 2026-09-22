"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROJECT_SIZE_LIMITS, type SizePreset } from "@/data/presets";
import { createProject } from "@/model/project-factories";
import { saveProject } from "@/store/persistence";
import { CubeLogo } from "../logo/CubeLogo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { PresetGrid } from "./PresetGrid";

const { min, max } = PROJECT_SIZE_LIMITS;

/** Pick a name and a size, then open the editor. */
export function NewProjectScreen() {
  const router = useRouter();
  const [name, setName] = useState("Untitled design");
  const [presetId, setPresetId] = useState<string | null>("instagram-post");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const pickPreset = (preset: SizePreset) => {
    setPresetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const setCustom = (w: number, h: number) => {
    setPresetId(null);
    setWidth(w);
    setHeight(h);
  };

  const valid = width >= min && width <= max && height >= min && height <= max && name.trim().length > 0;

  const create = async () => {
    if (!valid) return;
    setBusy(true);
    setError(undefined);
    try {
      const project = createProject(name.trim(), width, height);
      await saveProject(project);
      router.push(`/editor/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project");
      setBusy(false);
    }
  };

  return (
    <main className="page-scroll new-project">
      <header className="home__bar">
        <Link href="/" className="row" style={{ gap: 10 }}>
          <CubeLogo size={28} />
          <span className="home__name">Photo Craft</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="new-project__body">
        <h1 className="new-project__title">Create a project</h1>
        <div className="new-project__form">
          <label className="field">
            <span className="field__label">Project name</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </label>
          <div className="row">
            <label className="field grow">
              <span className="field__label">Width (px)</span>
              <input className="input" type="number" min={min} max={max} value={width} onChange={(e) => setCustom(Number(e.target.value), height)} />
            </label>
            <label className="field grow">
              <span className="field__label">Height (px)</span>
              <input className="input" type="number" min={min} max={max} value={height} onChange={(e) => setCustom(width, Number(e.target.value))} />
            </label>
            <button type="button" className="btn" style={{ marginTop: 18 }} onClick={() => setCustom(height, width)} title="Swap width and height">
              Swap
            </button>
          </div>
          <p className="small muted">
            Any size from {min} to {max} px on each side. You can export at a multiple of this size later.
          </p>
          {error ? <p className="small" style={{ color: "var(--danger)" }}>{error}</p> : null}
          <button type="button" className="btn btn--primary btn--block" disabled={!valid || busy} onClick={() => void create()}>
            {busy ? "Creating" : "Create project"}
          </button>
        </div>
        <PresetGrid selectedId={presetId} onSelect={pickPreset} />
      </div>
    </main>
  );
}
