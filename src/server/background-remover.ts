/**
 * Background removal on the server: checks the setup, keeps one Python
 * worker alive while there is work, and stops it after a quiet spell.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { startWorker, type BackgroundWorker } from "./background-worker";
import { findPython } from "./python";

export { ImageError } from "./background-worker";

/** What the API reports about the remover. */
export interface RemovalStatus {
  available: boolean;
  /** Plain words on what is missing when not available. */
  reason?: string;
  model: string;
}

const SCRIPT = path.join(process.cwd(), "scripts", "background_remover.py");
const MODEL = process.env.PHOTO_CRAFT_BG_MODEL ?? "u2net";
/** The first request also downloads the model, so it gets a long leash. */
const STARTUP_TIMEOUT_MS = 300_000;
const REQUEST_TIMEOUT_MS = 180_000;
const IDLE_TIMEOUT_MS = 10 * 60_000;
const STATUS_TTL_MS = 30_000;

const SETUP_HINT = "Install Python 3 and run: pip install -r requirements.txt, then restart the server.";

let statusCache: { value: RemovalStatus; at: number } | null = null;

function describeMissingPython(): string {
  const configured = process.env.PHOTO_CRAFT_PYTHON;
  const hint = configured ? `PHOTO_CRAFT_PYTHON is set to "${configured}" but it does not run. ` : "No Python interpreter was found. ";
  return `${hint}${SETUP_HINT}`;
}

/** Checks that Python and rembg are installed. Cached for a short while. */
export function getRemovalStatus(): RemovalStatus {
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.value;
  const python = findPython();
  let value: RemovalStatus;
  if (!python) {
    value = { available: false, reason: describeMissingPython(), model: MODEL };
  } else {
    const probe = spawnSync(python, [SCRIPT, "--check"], { timeout: 15_000, encoding: "utf8" });
    const ok = probe.status === 0 && probe.stdout.includes('"ok": true');
    const configured = process.env.PHOTO_CRAFT_PYTHON;
    const wrongInterpreter = configured && configured !== python ? `PHOTO_CRAFT_PYTHON is set to "${configured}" but it does not run, so ${python} was used. ` : "";
    value = ok
      ? { available: true, model: MODEL }
      : { available: false, reason: `${wrongInterpreter}The rembg package is not installed for ${python}. ${SETUP_HINT}`, model: MODEL };
  }
  statusCache = { value, at: Date.now() };
  return value;
}

let worker: BackgroundWorker | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
}

/** Stops the worker after a quiet spell, but never while a request is in flight. */
function armIdleTimer(current: BackgroundWorker): void {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (worker === current && !current.busy()) current.stop("Idle.");
    else if (worker === current) armIdleTimer(current);
  }, IDLE_TIMEOUT_MS);
}

function getWorker(python: string): BackgroundWorker {
  if (worker) return worker;
  const started: BackgroundWorker = startWorker({
    python,
    script: SCRIPT,
    startupTimeoutMs: STARTUP_TIMEOUT_MS,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    onExit: (reason) => {
      if (worker === started) {
        worker = null;
        clearIdleTimer();
      }
      if (reason !== "Idle.") console.warn(`[background-remover] ${reason}`);
    },
  });
  worker = started;
  return started;
}

/**
 * Removes the background from an image and returns a PNG with transparency.
 * Rejects with ImageError when the bytes are not a readable image, and with
 * a plain Error when the worker is missing or fails.
 */
export async function removeBackground(image: Uint8Array): Promise<Uint8Array> {
  const python = findPython();
  if (!python) throw new Error(describeMissingPython());
  const current = getWorker(python);
  clearIdleTimer();
  try {
    await current.ready;
    return await current.send(image);
  } finally {
    if (worker === current) armIdleTimer(current);
  }
}
