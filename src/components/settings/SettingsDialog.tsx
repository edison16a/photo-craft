"use client";
import { useEffect } from "react";
import { useModelStorage } from "@/hooks/use-model-storage";
import { MODEL_TIERS, MODELS } from "@/lib/background/model";
import { useSettingsUiStore } from "@/store/settings-ui-store";
import { Modal } from "../ui/Modal";

/**
 * The settings dialog. For now it holds one thing: which cutout model the
 * background remover uses, with a way to delete the downloaded one from
 * this computer. Picking another model removes the current one.
 */
export function SettingsDialog() {
  const open = useSettingsUiStore((s) => s.settingsOpen);
  const close = useSettingsUiStore((s) => s.closeSettings);
  const { chosen, cached, busy, choose, remove, refresh } = useModelStorage();

  // A model may have been downloaded since the page loaded.
  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  return (
    <Modal open={open} title="Settings" onClose={close} width={520}>
      <div className="stack" style={{ gap: 12 }}>
        <span className="label">Background remover model</span>
        <div className="stack model-list" role="radiogroup" aria-label="Background remover model">
          {MODEL_TIERS.map((tier) => {
            const model = MODELS[tier];
            const active = tier === chosen;
            return (
              <div key={tier} className={`model-option ${active ? "model-option--active" : ""}`}>
                <button type="button" role="radio" aria-checked={active} className="model-option__pick" disabled={busy} onClick={() => void choose(tier)}>
                  <span className="model-option__name">{model.label}</span>
                  <span className="small muted">{model.blurb}</span>
                  <span className="small muted">{cached[tier] ? "On this computer." : "Downloads on first use."}</span>
                </button>
                {cached[tier] ? (
                  <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => void remove(tier)}>
                    Delete from this computer
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="small muted">Picking another model removes the current one from this computer. The next background removal downloads the new one.</p>
      </div>
    </Modal>
  );
}
