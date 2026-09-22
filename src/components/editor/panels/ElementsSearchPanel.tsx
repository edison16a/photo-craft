"use client";
import { useEffect, useState } from "react";
import { useAddElement } from "@/hooks/use-add-element";
import { useSettings } from "@/hooks/use-settings";
import {
  buildGoogleImagesPopupUrl,
  hasGoogleCredentials,
  searchGoogleImages,
  type ImageSearchResult,
} from "@/services/google-search";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { Icon } from "../../ui/Icon";
import { Toggle } from "../../ui/Toggle";
import { GoogleSetup } from "./GoogleSetup";
import { SearchResults } from "./SearchResults";

interface LastSearch {
  query: string;
  transparentOnly: boolean;
  results: ImageSearchResult[];
  nextStart: number | undefined;
}

/** The most recent search, kept while the editor is open. */
let lastSearch: LastSearch = { query: "", transparentOnly: true, results: [], nextStart: undefined };

/**
 * Search Google Images for elements. With API credentials the results show
 * inline. Without them, or as well, a popup opens Google Images and you can
 * drag any picture from it straight onto the canvas.
 */
export function ElementsSearchPanel() {
  const { settings } = useSettings();
  const { addImageUrl } = useAddElement();
  const [query, setQuery] = useState(lastSearch.query);
  const [transparentOnly, setTransparentOnly] = useState(lastSearch.transparentOnly);
  const [results, setResults] = useState<ImageSearchResult[]>(lastSearch.results);
  const [nextStart, setNextStart] = useState<number | undefined>(lastSearch.nextStart);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const ready = hasGoogleCredentials(settings);

  // Adding an image switches to the selection panel, which unmounts this one.
  // Remember the search so coming back does not cost another API call.
  useEffect(() => {
    lastSearch = { query, transparentOnly, results, nextStart };
  }, [query, transparentOnly, results, nextStart]);

  const run = async (start?: number) => {
    if (!query.trim() || !ready || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const page = await searchGoogleImages(
        { apiKey: settings.googleApiKey, searchEngineId: settings.googleSearchEngineId },
        { query: query.trim(), start, transparentOnly },
      );
      setResults((current) => (start ? [...current, ...page.results] : page.results));
      setNextStart(page.nextStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const openPopup = () => {
    const url = buildGoogleImagesPopupUrl(query.trim() || "png icon", transparentOnly);
    window.open(url, "photo-craft-google-images", "popup=yes,width=900,height=700");
    useEditorUiStore.getState().showToast("Drag any image from the popup onto your page");
  };

  /** Full size hosts often block downloads. Google's own thumbnail is the fallback. */
  const pick = async (result: ImageSearchResult) => {
    const added = await addImageUrl(result.imageUrl, undefined, true);
    if (!added) await addImageUrl(result.thumbnailUrl);
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <form className="stack" style={{ gap: 8 }} onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <input className="input" placeholder="Search for elements, for example arrow png" value={query}
          onChange={(event) => setQuery(event.target.value)} />
        <Toggle checked={transparentOnly} onChange={setTransparentOnly} label="Transparent backgrounds only" />
        <div className="row">
          <button type="submit" className="btn btn--primary grow" disabled={!ready || busy || !query.trim()} title={ready ? "" : "Add your Google API key below"}>
            <Icon name="search" size={16} />
            Search
          </button>
          <button type="button" className="btn grow" onClick={openPopup}>
            <Icon name="externalLink" size={16} />
            Google popup
          </button>
        </div>
      </form>
      {error ? <p className="small" style={{ color: "var(--danger)" }}>{error}</p> : null}
      {!ready ? (
        <p className="small muted">No API key yet. Use the popup: search there, then drag any image onto your page, or copy an image and paste it with Ctrl+V.</p>
      ) : null}
      {results.length > 0 ? (
        <SearchResults results={results} busy={busy} onPick={(r) => void pick(r)} onMore={nextStart ? () => void run(nextStart) : undefined} />
      ) : null}
      <GoogleSetup />
    </div>
  );
}
