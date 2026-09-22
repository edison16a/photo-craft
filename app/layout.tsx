import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/ui.css";
import "@/styles/overlays.css";
import "@/styles/home.css";
import "@/styles/editor.css";
import "@/styles/panels.css";
import "@/styles/pickers.css";

/** Site wide title and description. */
export const metadata: Metadata = {
  title: "Photo Craft",
  description:
    "A free, open source alternative to Canva for simple image editing, creation and iteration.",
};

/**
 * Applies the saved theme before the first paint so the page never flashes
 * the wrong colours. Runs inline in the document head.
 */
const themeBootScript = `
(function () {
  try {
    var saved = localStorage.getItem("photo-craft:theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

/**
 * Root layout shared by every route. Loads the global stylesheets and the
 * theme boot script.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
