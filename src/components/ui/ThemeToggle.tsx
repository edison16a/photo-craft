"use client";
import { useTheme } from "@/hooks/use-theme";
import { IconButton } from "./IconButton";

/** Switches between light and dark mode. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
      icon={theme === "dark" ? "sun" : "moon"}
      label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    />
  );
}
