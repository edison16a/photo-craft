"use client";
import type { DragEvent } from "react";
import type { ImageSearchResult } from "@/services/google-search";

interface SearchResultsProps {
  results: ImageSearchResult[];
  busy: boolean;
  onPick: (result: ImageSearchResult) => void;
  onMore?: () => void;
}

/** Grid of image results. Click to add, or drag onto the canvas. */
export function SearchResults({ results, busy, onPick, onMore }: SearchResultsProps) {
  const onDragStart = (event: DragEvent<HTMLButtonElement>, result: ImageSearchResult) => {
    event.dataTransfer.setData("text/uri-list", result.imageUrl);
    event.dataTransfer.setData("text/plain", result.imageUrl);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="stack">
      <div className="result-grid">
        {results.map((result) => (
          <button
            key={result.id}
            type="button"
            className="result"
            title={`${result.title} (${result.width} x ${result.height})`}
            draggable
            onDragStart={(event) => onDragStart(event, result)}
            onClick={() => onPick(result)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.thumbnailUrl} alt={result.title} loading="lazy" />
          </button>
        ))}
      </div>
      {onMore ? (
        <button type="button" className="btn btn--sm" disabled={busy} onClick={onMore}>
          {busy ? "Loading" : "More results"}
        </button>
      ) : null}
    </div>
  );
}
