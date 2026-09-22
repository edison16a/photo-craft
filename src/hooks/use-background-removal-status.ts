"use client";
/**
 * Asks the server once per page load whether the background remover is
 * set up, and shares the answer between every image that gets selected.
 */
import { useEffect, useState } from "react";
import { fetchBackgroundRemovalStatus, type BackgroundRemovalStatus } from "../services/background-removal";

let cached: Promise<BackgroundRemovalStatus> | null = null;

/** Status of the remover, or undefined while the first check is running. */
export function useBackgroundRemovalStatus(): BackgroundRemovalStatus | undefined {
  const [status, setStatus] = useState<BackgroundRemovalStatus>();

  useEffect(() => {
    let cancelled = false;
    cached ??= fetchBackgroundRemovalStatus();
    cached.then((value) => {
      if (!cancelled) setStatus(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

/** Forgets the cached answer, for example after the user installs rembg. */
export function resetBackgroundRemovalStatus(): void {
  cached = null;
}
