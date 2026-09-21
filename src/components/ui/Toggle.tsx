interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** Small switch with a text label. */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="row" style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle ${checked ? "toggle--on" : ""}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
      <span className="small">{label}</span>
    </label>
  );
}
