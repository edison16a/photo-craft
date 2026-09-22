"use client";
import { useSettingsUiStore } from "@/store/settings-ui-store";
import { IconButton } from "../ui/IconButton";
import { SettingsDialog } from "./SettingsDialog";

/** The gear in the top right that opens the settings, with the dialog it opens. */
export function SettingsButton() {
  const openSettings = useSettingsUiStore((s) => s.openSettings);
  return (
    <>
      <IconButton icon="settings" label="Settings" onClick={openSettings} />
      <SettingsDialog />
    </>
  );
}
