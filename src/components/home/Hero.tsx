import Link from "next/link";
import { SITE_HOST, SITE_URL } from "@/data/site";
import { CubeLogo } from "../logo/CubeLogo";

/** The pitch at the top of the home page. */
export function Hero() {
  return (
    <section className="hero">
      <div className="row" style={{ gap: 12 }}>
        <CubeLogo size={40} />
        <h1 className="hero__title">Photo Craft</h1>
      </div>
      <p className="hero__lead">
        Tired of paying for Canva? Try this free alternative, built only for simple image editing,
        creation and iteration.
      </p>
      <p className="muted hero__sub">
        Pick a size, add text, shapes and images, then export at any scale in PNG, JPG, WebP or PDF
        with a transparent background if you want one. Projects stay in your browser. No account, no
        watermark, no paywall.
      </p>
      <div className="row">
        <Link href="/new" className="btn btn--primary">
          New project
        </Link>
        <a className="btn btn--ghost" href={SITE_URL} target="_blank" rel="noreferrer">
          {SITE_HOST}
        </a>
        <a
          className="btn btn--ghost"
          href="https://github.com/edison16a/photo-craft"
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub
        </a>
      </div>
    </section>
  );
}
