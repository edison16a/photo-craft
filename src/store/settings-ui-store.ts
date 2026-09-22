/**
 * The settings dialog and the one time hint that points at its button.
 * Nothing here is saved except the hint's dismissal, which goes to the
 * app settings so it is only ever shown once.
 */
import { create } from "zustand";
import { loadSettings, saveSettings } from "../services/settings";

/** State and actions for the settings dialog. */
export interface SettingsUiState {
  settingsOpen: boolean;
  /** True while the hint next to the settings button is showing. */
  modelHint: boolean;

  openSettings: () => void;
  closeSettings: () => void;
  /** Shows the hint once, the first time the remover is used. */
  showModelHint: () => void;
  dismissModelHint: () => void;
}

/** Store for the settings dialog. */
export const useSettingsUiStore = create<SettingsUiState>()((set) => ({
  settingsOpen: false,
  modelHint: false,

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  showModelHint: () => {
    if (loadSettings().modelHintShown) return;
    set({ modelHint: true });
  },
  dismissModelHint: () => {
    saveSettings({ modelHintShown: true });
    set({ modelHint: false });
  },
}));
