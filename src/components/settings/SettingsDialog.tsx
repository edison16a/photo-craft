"use client";
import { useEffect, useState } from "react";
import { useModelStorage } from "@/hooks/use-model-storage";
import { useSettingsUiStore } from "@/store/settings-ui-store";
import { Modal } from "../ui/Modal";
import { Tabs } from "../ui/Tabs";
import { KeybindsPage } from "./KeybindsPage";
import { ModelPage } from "./ModelPage";

type SettingsPage = "model" | "keybinds";

const PAGES: { id: SettingsPage; label: string }[] = [
  { id: "model", label: "Model" },
  { id: "keybinds", label: "Keybinds" },
];

/**
 * The settings dialog, with two pages behind a row of tabs: the cutout
 * model and the keybinds. The model storage lives here rather than in its
 * page, so a download keeps reporting while the other page is showing.
 */
export function SettingsDialog() {
  const open = useSettingsUiStore((s) => s.settingsOpen);
  const close = useSettingsUiStore((s) => s.closeSettings);
  const [page, setPage] = useState<SettingsPage>("model");
  const storage = useModelStorage();
  const refresh = storage.refresh;

  // Start on the model page, and re-check what is downloaded, each time it opens.
  useEffect(() => {
    if (!open) return;
    setPage("model");
    void refresh();
  }, [open, refresh]);

  return (
    <Modal open={open} title="Settings" onClose={close} width={520}>
      <Tabs items={PAGES} value={page} onChange={setPage} label="Settings pages" />
      {page === "model" ? <ModelPage {...storage} /> : <KeybindsPage />}
    </Modal>
  );
}
