import { forwardRef, type ButtonHTMLAttributes } from "react";
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
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ icon, label, active, size = 18, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
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
});
