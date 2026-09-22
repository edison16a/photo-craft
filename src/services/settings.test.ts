import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_KEYBINDS } from "../lib/keybinds";
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
    expect(DEFAULT_SETTINGS).toEqual({ autosave: true, backgroundModel: "best", keybinds: DEFAULT_KEYBINDS });
  });

  it("does not hand out the shared defaults object", () => {
    const loaded = loadSettings();
    loaded.autosave = false;
    loaded.keybinds.select = null;
    expect(DEFAULT_SETTINGS.autosave).toBe(true);
    expect(DEFAULT_KEYBINDS.select).toBe("s");
  });

  it("round trips through localStorage", () => {
    const saved = saveSettings({ autosave: false });
    expect(saved).toEqual({ ...DEFAULT_SETTINGS, autosave: false });
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "{}")).toEqual(saved);
    expect(loadSettings()).toEqual(saved);
  });

  it("merges a partial patch with what was already saved", () => {
    saveSettings({ autosave: false });
    const next = saveSettings({ autosave: false });
    expect(next).toEqual({ ...DEFAULT_SETTINGS, autosave: false });
  });

  it("leaves a field alone when the patch sets it to undefined", () => {
    saveSettings({ autosave: false });
    const next = saveSettings({ autosave: undefined });
    expect(next).toEqual({ ...DEFAULT_SETTINGS, autosave: false });
    expect(loadSettings()).toEqual(next);
  });

  it("keeps an unpicked model as null", () => {
    expect(saveSettings({ backgroundModel: null })).toEqual({ ...DEFAULT_SETTINGS, backgroundModel: null });
    expect(loadSettings().backgroundModel).toBeNull();
    window.localStorage.setItem(KEY, JSON.stringify({ backgroundModel: null }));
    expect(loadSettings().backgroundModel).toBeNull();
  });

  it("tolerates bad JSON", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("fills missing fields and ignores wrongly typed ones", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ unknown: "k", autosave: "yes", backgroundModel: "huge" }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    window.localStorage.setItem(KEY, JSON.stringify({ backgroundModel: "light", modelHintShown: true, keybinds: { draw: "p", select: null } }));
    expect(loadSettings()).toEqual({ autosave: true, backgroundModel: "light", keybinds: { ...DEFAULT_KEYBINDS, draw: "p", select: null } });
    window.localStorage.setItem(KEY, JSON.stringify(null));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    window.localStorage.setItem(KEY, JSON.stringify([1, 2]));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("notifies subscribers on save and stops after unsubscribe", () => {
    const seen: AppSettings[] = [];
    const unsubscribe = subscribeToSettings((settings) => seen.push(settings));
    saveSettings({ autosave: false });
    expect(seen).toHaveLength(1);
    expect(seen[0].autosave).toBe(false);
    unsubscribe();
    saveSettings({ autosave: true });
    expect(seen).toHaveLength(1);
  });

  it("reacts to storage events from other tabs for our key only", () => {
    const seen: AppSettings[] = [];
    const unsubscribe = subscribeToSettings((settings) => seen.push(settings));
    window.localStorage.setItem(KEY, JSON.stringify({ autosave: false }));
    window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key" }));
    expect(seen).toHaveLength(0);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(seen).toHaveLength(1);
    expect(seen[0].autosave).toBe(false);
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(seen).toHaveLength(2);
    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(seen).toHaveLength(2);
  });
});
