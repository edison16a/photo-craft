"use client";
import { useRef } from "react";
import { useSettingsUiStore } from "@/store/settings-ui-store";
import { IconButton } from "../ui/IconButton";
import { Popover } from "../ui/Popover";
import { SettingsDialog } from "./SettingsDialog";

/**
 * The gear in the top right that opens the settings. The first time the
 * background remover runs it lights up, with a note beside it saying the
 * model can be changed here.
 */
export function SettingsButton() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hint = useSettingsUiStore((s) => s.modelHint);
  const dismiss = useSettingsUiStore((s) => s.dismissModelHint);
  const openSettings = useSettingsUiStore((s) => s.openSettings);

  return (
    <>
      <IconButton
        ref={anchorRef}
        icon="settings"
        label="Settings"
        className={hint ? "settings-btn settings-btn--hint" : "settings-btn"}
        onClick={() => {
          if (hint) dismiss();
          openSettings();
        }}
      />
      <Popover open={hint} anchorRef={anchorRef} onClose={dismiss} label="About the background remover model" width={260}>
        <div className="stack" style={{ gap: 10 }}>
          <p>Click in settings to change the photo remover model.</p>
          <button type="button" className="btn btn--primary btn--sm" onClick={dismiss}>
            Okay
          </button>
        </div>
      </Popover>
      <SettingsDialog />
    </>
  );
}
