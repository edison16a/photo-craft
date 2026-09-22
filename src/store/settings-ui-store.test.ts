import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings } from "../services/settings";
import { useSettingsUiStore } from "./settings-ui-store";

const store = () => useSettingsUiStore.getState();

describe("settings ui store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsUiStore.setState({ settingsOpen: false, modelHint: false });
  });

  it("shows the model hint once and remembers the dismissal", () => {
    store().showModelHint();
    expect(store().modelHint).toBe(true);
    store().dismissModelHint();
    expect(store().modelHint).toBe(false);
    expect(loadSettings().modelHintShown).toBe(true);
    store().showModelHint();
    expect(store().modelHint).toBe(false);
  });

  it("opens and closes the dialog", () => {
    store().openSettings();
    expect(store().settingsOpen).toBe(true);
    store().closeSettings();
    expect(store().settingsOpen).toBe(false);
  });
});
