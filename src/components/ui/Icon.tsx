import { ICON_PATHS, type IconName } from "./icon-paths";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Inline stroke icon. Colour comes from the surrounding text colour. */
export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
