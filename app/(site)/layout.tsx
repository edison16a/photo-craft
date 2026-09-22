import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";

/**
 * Shell shared by the photo editor home and the remove background page.
 * The bar with both sections lives here, so it stays put while the page
 * below it changes.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site page-scroll">
      <SiteHeader />
      {children}
    </div>
  );
}
