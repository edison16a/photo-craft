"use client";
import { useEffect, useRef, useState } from "react";

interface NativeColorInputProps {
  /** A normalised six digit hex colour. */
  value: string;
  onCommit: (hex: string) => void;
}

/**
 * The browser's own colour dialog. React's onChange fires for every move
 * inside the dialog, so the value is kept locally and only stored on the
 * native change event, which fires once when the dialog closes.
 */
export function NativeColorInput({ value, onCommit }: NativeColorInputProps) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const onNativeChange = () => commitRef.current(input.value);
    input.addEventListener("change", onNativeChange);
    return () => input.removeEventListener("change", onNativeChange);
  }, []);

  return (
    <input
      ref={ref}
      type="color"
      className="color-native"
      aria-label="Custom colour"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
