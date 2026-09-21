"use client";
/**
 * React binding for the app settings stored in localStorage (Google API
 * credentials and the autosave switch).
 */
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  subscribeToSettings,
  type AppSettings,
} from "../services/settings";

export function useSettings(): {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
} {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
    return subscribeToSettings(setSettings);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(saveSettings(patch));
  }, []);

  return { settings, updateSettings };
}
