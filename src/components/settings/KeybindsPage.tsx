"use client";
import { useState, type KeyboardEvent } from "react";
import { useSettings } from "@/hooks/use-settings";
import { assignKey, DEFAULT_KEYBINDS, isBindableKey, KEYBIND_SPECS, keyLabel, type KeybindAction } from "@/lib/keybinds";

const GROUPS = Array.from(new Set(KEYBIND_SPECS.map((spec) => spec.group)));

/**
 * The keybinds page of the settings: every action that can have a key,
 * grouped, with its key on the right. Click a key and press the new one.
 * Backspace clears it and Escape leaves it as it was. A key taken from
 * another action leaves that one unset.
 */
export function KeybindsPage() {
  const { settings, updateSettings } = useSettings();
  const [recording, setRecording] = useState<KeybindAction | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, action: KeybindAction) => {
    if (recording !== action) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") return setRecording(null);
    if (event.key === "Backspace" || event.key === "Delete") {
      updateSettings({ keybinds: assignKey(settings.keybinds, action, null) });
      return setRecording(null);
    }
    if (!isBindableKey(event.key)) return;
    updateSettings({ keybinds: assignKey(settings.keybinds, action, event.key) });
    setRecording(null);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      {GROUPS.map((group) => (
        <div key={group} className="stack" style={{ gap: 4 }}>
          <span className="label">{group}</span>
          {KEYBIND_SPECS.filter((spec) => spec.group === group).map((spec) => {
            const key = settings.keybinds[spec.action];
            const active = recording === spec.action;
            const classes = ["keybind__key", active ? "keybind__key--recording" : "", key === null && !active ? "keybind__key--unset" : ""];
            return (
              <div key={spec.action} className="keybind">
                <span>{spec.label}</span>
                <button
                  type="button"
                  className={classes.filter(Boolean).join(" ")}
                  aria-label={`${spec.label} key`}
                  data-escape={active ? "own" : undefined}
                  onClick={() => setRecording(active ? null : spec.action)}
                  onKeyDown={(event) => onKeyDown(event, spec.action)}
                  onBlur={() => setRecording((current) => (current === spec.action ? null : current))}
                >
                  {active ? "Press a key" : key === null ? "Unset" : keyLabel(key)}
                </button>
              </div>
            );
          })}
        </div>
      ))}
      <div className="row row--between">
        <span className="small muted">{recording ? "Backspace clears it." : ""}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => updateSettings({ keybinds: { ...DEFAULT_KEYBINDS } })}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
