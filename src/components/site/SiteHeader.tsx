"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPO_URL } from "@/data/site";
import { CubeLogo } from "../logo/CubeLogo";
import { GitHubMark } from "../ui/GitHubMark";
import { ThemeToggle } from "../ui/ThemeToggle";

/** The two sections of the site, in the order they appear. */
const SECTIONS = [
  { href: "/", label: "Projects" },
  { href: "/remove-bg", label: "Remove background" },
] as const;

interface SiteHeaderProps {
  /** Stretch across the whole window instead of the home page's column. */
  wide?: boolean;
}

/** Bar at the top of the home and remove background pages: name, sections, GitHub and theme. */
export function SiteHeader({ wide }: SiteHeaderProps) {
  const pathname = usePathname();
  return (
    <header className={`site-bar ${wide ? "site-bar--wide" : ""}`}>
      <div className="row" style={{ gap: 10 }}>
        <CubeLogo size={28} />
        <span className="home__name">Photo Craft</span>
      </div>
      <nav className="site-nav" aria-label="Sections">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
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
      </nav>
      <div className="row site-bar__end">
        <a className="btn btn--github" href={REPO_URL} target="_blank" rel="noreferrer">
          <GitHubMark />
          View on GitHub
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
