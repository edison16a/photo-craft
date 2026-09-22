"use client";
import type { useModelStorage } from "@/hooks/use-model-storage";
import { MODEL_TIERS, MODELS, modelSizeLabel } from "@/lib/background/model";
import { Icon } from "../ui/Icon";

type ModelStorage = ReturnType<typeof useModelStorage>;

/**
 * The model page of the settings: the three cutout models side by side
 * with the picked one highlighted, and a button that deletes the picked
 * one from this computer. Picking a model downloads it straight away, and
 * a tick marks the one that is on this computer.
 */
export function ModelPage({ chosen, cached, download, error, busy, choose, removeCurrent }: ModelStorage) {
  const canDelete = chosen !== null && cached[chosen] && !busy;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <span className="label">Background remover model</span>
      <div className="model-grid" role="radiogroup" aria-label="Background remover model">
        {MODEL_TIERS.map((tier) => {
          const active = tier === chosen;
          const downloading = download?.tier === tier;
          return (
            <button
              key={tier}
              type="button"
              role="radio"
              aria-checked={active}
              className={`model-card ${active ? "model-card--active" : ""}`}
              disabled={busy}
              onClick={() => void choose(tier)}
            >
              {cached[tier] && !downloading ? <Icon name="check" size={14} className="model-card__check" /> : null}
              <span className="model-card__name">{MODELS[tier].label}</span>
              <span className="small muted">{downloading ? `${Math.round(download.fraction * 100)}%` : modelSizeLabel(MODELS[tier])}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="small" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button type="button" className="btn" disabled={!canDelete} onClick={() => void removeCurrent()}>
          Delete current model
        </button>
      </div>
    </div>
  );
}
