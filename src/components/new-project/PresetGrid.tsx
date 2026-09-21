"use client";
import { PRESET_CATEGORIES, SIZE_PRESETS, type PresetCategory, type SizePreset } from "@/data/presets";

interface PresetGridProps {
  selectedId: string | null;
  onSelect: (preset: SizePreset) => void;
}

/** Tiny outline that shows the shape of a preset. */
function PresetShape({ width, height }: { width: number; height: number }) {
  const scale = 36 / Math.max(width, height);
  return (
    <span
      className="preset__shape"
      style={{ width: Math.max(8, width * scale), height: Math.max(8, height * scale) }}
      aria-hidden="true"
    />
  );
}

/** Preset sizes grouped by what they are for. */
export function PresetGrid({ selectedId, onSelect }: PresetGridProps) {
  const byCategory = (category: PresetCategory) => SIZE_PRESETS.filter((p) => p.category === category);

  return (
    <div className="stack" style={{ gap: 20 }}>
      {PRESET_CATEGORIES.map((category) => (
        <section key={category.id}>
          <h3 className="label" style={{ marginBottom: 8 }}>
            {category.label}
          </h3>
          <div className="preset-grid">
            {byCategory(category.id).map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset ${selectedId === preset.id ? "preset--active" : ""}`}
                onClick={() => onSelect(preset)}
              >
                <PresetShape width={preset.width} height={preset.height} />
                <span className="preset__name">{preset.name}</span>
                <span className="small muted">
                  {preset.width} x {preset.height}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
