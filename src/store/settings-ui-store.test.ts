import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsUiStore } from "./settings-ui-store";

const store = () => useSettingsUiStore.getState();

describe("settings ui store", () => {
  beforeEach(() => {
    useSettingsUiStore.setState({ settingsOpen: false });
  });

  it("opens and closes the dialog", () => {
    store().openSettings();
    expect(store().settingsOpen).toBe(true);
    store().closeSettings();
    expect(store().settingsOpen).toBe(false);
  });
});
