import Link from "next/link";

/** Shown for unknown routes. */
export default function NotFound() {
  return (
    <main className="page-scroll centered">
      <div className="stack" style={{ alignItems: "center" }}>
        <h1>Page not found</h1>
        <p className="muted">That link does not go anywhere.</p>
        <Link href="/" className="btn btn--primary">
          Back to projects
        </Link>
      </div>
    </main>
  );
}
