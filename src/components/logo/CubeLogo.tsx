interface CubeLogoProps {
  size?: number;
}

/** A plain isometric cube in three shades of the accent blue. */
export function CubeLogo({ size = 28 }: CubeLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Photo Craft" role="img">
      <path d="M12 2l9 5v10l-9 5-9-5V7z" fill="#2b8cff" />
      <path d="M12 2l9 5-9 5-9-5z" fill="#8ec5ff" />
      <path d="M12 12l9-5v10l-9 5z" fill="#1f6fd1" />
    </svg>
  );
}
