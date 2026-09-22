"use client";
import { useState } from "react";
import { CompareView } from "./CompareView";
import { Icon } from "../ui/Icon";

interface LandingProps {
  onPick: () => void;
  /** True while something is being dragged over the page. */
  dragActive: boolean;
}

/** The sample picture, shipped with the site. */
const DEMO = { original: "/demo/before.jpg", cutout: "/demo/after.webp" };

/**
 * What the page shows before any picture is added: the name of the tool,
 * a sample you can compare, and the box to drop or pick pictures.
 */
export function Landing({ onPick, dragActive }: LandingProps) {
  const [split, setSplit] = useState(0.5);
  return (
    <section className="landing">
      <h1 className="landing__title">Background Remover</h1>
      <p className="landing__subtitle">Remove the background from any image in seconds.</p>
      <div className="landing__columns">
        <div className="landing__demo">
          <CompareView originalUrl={DEMO.original} cutoutUrl={DEMO.cutout} split={split} onSplitChange={setSplit} alt="A tiger, with and without its background" />
        </div>
        <div className={`landing__drop ${dragActive ? "landing__drop--over" : ""}`}>
          <p>Drop files here or</p>
          <button type="button" className="btn btn--primary btn--lg" onClick={onPick}>
            <Icon name="upload" size={18} />
            Upload Photo
          </button>
          <p className="small">Paste works too. Nothing is uploaded and nothing is kept once you leave.</p>
        </div>
      </div>
    </section>
  );
}
