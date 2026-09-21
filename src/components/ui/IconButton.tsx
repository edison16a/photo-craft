import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icon-paths";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Shown as a tooltip and read by screen readers. */
  label: string;
  active?: boolean;
  size?: number;
}

/** Square button that shows one icon and describes itself with a label. */
export function IconButton({ icon, label, active, size = 18, className = "", ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? "icon-btn--active" : ""} ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
