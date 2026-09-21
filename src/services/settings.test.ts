import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  subscribeToSettings,
  type AppSettings,
} from "./settings";

const KEY = "photo-craft:settings";

describe("settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the defaults when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ googleApiKey: "", googleSearchEngineId: "", autosave: true });
  });

  it("does not hand out the shared defaults object", () => {
    const loaded = loadSettings();
    loaded.googleApiKey = "changed";
    expect(DEFAULT_SETTINGS.googleApiKey).toBe("");
  });

  it("round trips through localStorage", () => {
    const saved = saveSettings({ googleApiKey: "abc", googleSearchEngineId: "cx1", autosave: false });
    expect(saved).toEqual({ googleApiKey: "abc", googleSearchEngineId: "cx1", autosave: false });
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "{}")).toEqual(saved);
    expect(loadSettings()).toEqual(saved);
  });

  it("merges a partial patch with what was already saved", () => {
    saveSettings({ googleApiKey: "abc" });
    const next = saveSettings({ autosave: false });
    expect(next).toEqual({ googleApiKey: "abc", googleSearchEngineId: "", autosave: false });
  });

  it("leaves a field alone when the patch sets it to undefined", () => {
    saveSettings({ googleApiKey: "abc", autosave: false });
    const next = saveSettings({ googleApiKey: undefined, googleSearchEngineId: "cx1" });
    expect(next).toEqual({ googleApiKey: "abc", googleSearchEngineId: "cx1", autosave: false });
    expect(loadSettings()).toEqual(next);
  });

  it("tolerates bad JSON", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("fills missing fields and ignores wrongly typed ones", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ googleApiKey: "k", autosave: "yes" }));
    expect(loadSettings()).toEqual({ googleApiKey: "k", googleSearchEngineId: "", autosave: true });
    window.localStorage.setItem(KEY, JSON.stringify(null));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    window.localStorage.setItem(KEY, JSON.stringify([1, 2]));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("notifies subscribers on save and stops after unsubscribe", () => {
    const seen: AppSettings[] = [];
    const unsubscribe = subscribeToSettings((settings) => seen.push(settings));
    saveSettings({ googleApiKey: "one" });
    expect(seen).toHaveLength(1);
    expect(seen[0].googleApiKey).toBe("one");
    unsubscribe();
    saveSettings({ googleApiKey: "two" });
    expect(seen).toHaveLength(1);
  });

  it("reacts to storage events from other tabs for our key only", () => {
    const seen: AppSettings[] = [];
    const unsubscribe = subscribeToSettings((settings) => seen.push(settings));
    window.localStorage.setItem(KEY, JSON.stringify({ googleSearchEngineId: "remote" }));
    window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key" }));
    expect(seen).toHaveLength(0);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(seen).toHaveLength(1);
    expect(seen[0].googleSearchEngineId).toBe("remote");
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(seen).toHaveLength(2);
    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(seen).toHaveLength(2);
  });
});
