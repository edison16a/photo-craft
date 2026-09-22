/**
 * Whether the settings dialog is open. Nothing here is saved.
 */
import { create } from "zustand";

/** State and actions for the settings dialog. */
export interface SettingsUiState {
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

/** Store for the settings dialog. */
export const useSettingsUiStore = create<SettingsUiState>()((set) => ({
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
