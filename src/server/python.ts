/**
 * Finds a Python interpreter for the background remover. Server only.
 *
 * PHOTO_CRAFT_PYTHON wins when set (for example the interpreter inside a
 * virtual environment). Otherwise python3 and python are tried in turn.
 */
import { spawnSync } from "node:child_process";

let resolved: string | null | undefined;

/** Path or command of a working Python interpreter, or null when none runs. */
export function findPython(): string | null {
  if (resolved !== undefined) return resolved;
  const candidates = [process.env.PHOTO_CRAFT_PYTHON, "python3", "python"].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
  resolved = null;
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { timeout: 5000 });
    if (probe.status === 0) {
      resolved = candidate;
      break;
    }
  }
  return resolved;
}

/** Forgets the cached interpreter so the next lookup runs again. */
export function resetPythonLookup(): void {
  resolved = undefined;
}
