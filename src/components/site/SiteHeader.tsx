"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { REPO_URL } from "@/data/site";
import { CubeLogo } from "../logo/CubeLogo";
import { SettingsButton } from "../settings/SettingsButton";
import { GitHubMark } from "../ui/GitHubMark";
import { ThemeToggle } from "../ui/ThemeToggle";

/** The two sections of the site, in the order they appear. */
const SECTIONS = [
  { href: "/", label: "Photo Editor" },
  { href: "/remove-bg", label: "Background Remover" },
] as const;

/** Where the blue line sits, relative to the nav. */
interface Underline {
  left: number;
  width: number;
}

/**
 * Bar at the top of the photo editor home, the new project page and the
 * background remover: name, the two sections, GitHub and theme. It lives
 * in the shared layout, so it stays put while the page below changes and
 * the blue line slides from one section to the other.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [underline, setUnderline] = useState<Underline | null>(null);

  // Measure the current section after each route change so the line can slide to it.
  useLayoutEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    setUnderline(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
  }, [pathname]);

  return (
    <header className="site-bar">
      <Link href="/" className="row site-bar__name" aria-label="Photo Craft home">
        <CubeLogo size={28} />
        <span className="home__name">Photo Craft</span>
      </Link>
      <nav ref={navRef} className="site-nav" aria-label="Sections">
        {SECTIONS.map((section) => {
          // Creating a project belongs to the editor section.
          const active = pathname === section.href || (section.href === "/" && pathname.startsWith("/new"));
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`site-nav__item ${active ? "site-nav__item--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {section.label}
            </Link>
          );
        })}
        <span
          className="site-nav__underline"
          aria-hidden="true"
          style={underline ? { left: underline.left, width: underline.width, opacity: 1 } : { opacity: 0 }}
        />
      </nav>
      <div className="row site-bar__end">
        <a className="btn btn--github" href={REPO_URL} target="_blank" rel="noreferrer">
          <GitHubMark />
          View on GitHub
        </a>
        <SettingsButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
