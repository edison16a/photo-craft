"use client";
import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

/** Fields for the free Google Custom Search API key and engine ID. */
export function GoogleSetup() {
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(!settings.googleApiKey);

  return (
    <details className="setup" open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
      <summary className="setup__summary">Google search setup</summary>
      <div className="stack" style={{ gap: 8, paddingTop: 8 }}>
        <p className="small muted">
          Inline results use Google&apos;s Custom Search API, which gives 100 free searches a day. Create a
          search engine at{" "}
          <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noreferrer">programmablesearchengine.google.com</a>{" "}
          with &quot;Search the entire web&quot; and image search on, then get an API key from{" "}
          <a href="https://developers.google.com/custom-search/v1/overview" target="_blank" rel="noreferrer">the Custom Search overview</a>.
          Both stay in this browser only.
        </p>
        <label className="field">
          <span className="field__label">API key</span>
          <input className="input input--sm" value={settings.googleApiKey} spellCheck={false}
            onChange={(event) => updateSettings({ googleApiKey: event.target.value.trim() })} />
        </label>
        <label className="field">
          <span className="field__label">Search engine ID (cx)</span>
          <input className="input input--sm" value={settings.googleSearchEngineId} spellCheck={false}
            onChange={(event) => updateSettings({ googleSearchEngineId: event.target.value.trim() })} />
        </label>
      </div>
    </details>
  );
}
