/**
 * Runs scripts/background_remover.py as a long lived worker. Server only.
 *
 * The worker loads the model once and answers requests in order over
 * stdin and stdout, see frame-protocol.ts. It is started on the first
 * request and stopped again after a while without work.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import { concatBytes, decodeResponse, encodeRequest, STATUS_OK } from "./frame-protocol";
import { findPython } from "./python";

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

/** Checks that Python and rembg are installed. Cached for a short while. */
export function getRemovalStatus(): RemovalStatus {
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.value;
  const python = findPython();
  let value: RemovalStatus;
  if (!python) {
    value = { available: false, reason: `No Python interpreter was found. ${SETUP_HINT}`, model: MODEL };
  } else {
    const probe = spawnSync(python, [SCRIPT, "--check"], { timeout: 15_000, encoding: "utf8" });
    const ok = probe.status === 0 && probe.stdout.includes('"ok": true');
    value = ok
      ? { available: true, model: MODEL }
      : { available: false, reason: `The rembg package is not installed for ${python}. ${SETUP_HINT}`, model: MODEL };
  }
  statusCache = { value, at: Date.now() };
  return value;
}

interface Pending {
  resolve: (png: Uint8Array) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface Worker {
  process: ChildProcess;
  ready: Promise<void>;
  buffer: Uint8Array;
  queue: Pending[];
  idleTimer: ReturnType<typeof setTimeout> | null;
}

let worker: Worker | null = null;

function stopWorker(reason: string): void {
  const current = worker;
  if (!current) return;
  worker = null;
  if (current.idleTimer) clearTimeout(current.idleTimer);
  for (const pending of current.queue.splice(0)) {
    clearTimeout(pending.timer);
    pending.reject(new Error(reason));
  }
  current.process.kill();
}

/** Hands finished frames in the buffer to the requests waiting for them. */
function drain(current: Worker): void {
  for (;;) {
    const decoded = decodeResponse(current.buffer);
    if (!decoded) return;
    current.buffer = current.buffer.slice(decoded.consumed);
    const pending = current.queue.shift();
    if (!pending) continue;
    clearTimeout(pending.timer);
    if (decoded.frame.status === STATUS_OK) pending.resolve(decoded.frame.payload);
    else pending.reject(new Error(new TextDecoder().decode(decoded.frame.payload)));
  }
}

function startWorker(python: string): Worker {
  const child = spawn(python, [SCRIPT], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PYTHONUNBUFFERED: "1" } });
  let announce: { resolve: () => void; reject: (error: Error) => void } | null = null;
  const ready = new Promise<void>((resolve, reject) => {
    announce = { resolve, reject };
  });
  const startupTimer = setTimeout(() => stopWorker("The background remover took too long to start."), STARTUP_TIMEOUT_MS);
  const current: Worker = { process: child, ready, buffer: new Uint8Array(), queue: [], idleTimer: null };
  let announced = false;

  child.stdout?.on("data", (chunk: Buffer) => {
    current.buffer = concatBytes(current.buffer, new Uint8Array(chunk));
    if (!announced) {
      const newline = current.buffer.indexOf(10);
      if (newline < 0) return;
      const line = new TextDecoder().decode(current.buffer.slice(0, newline));
      current.buffer = current.buffer.slice(newline + 1);
      announced = true;
      clearTimeout(startupTimer);
      const info = JSON.parse(line) as { ready?: boolean; error?: string };
      if (info.ready) announce?.resolve();
      else stopWorker(`The background remover failed to start: ${info.error ?? "unknown error"}`);
    }
    drain(current);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) console.warn(`[background-remover] ${text}`);
  });
  child.on("exit", (code) => {
    clearTimeout(startupTimer);
    if (worker === current) stopWorker(`The background remover stopped (exit code ${code ?? "unknown"}).`);
    announce?.reject(new Error("The background remover stopped before it was ready."));
  });
  ready.catch(() => undefined);
  return current;
}

/** Removes the background from an image and returns a PNG with transparency. */
export async function removeBackground(image: Uint8Array): Promise<Uint8Array> {
  const python = findPython();
  if (!python) throw new Error(`No Python interpreter was found. ${SETUP_HINT}`);
  if (!worker) worker = startWorker(python);
  const current = worker;
  await current.ready;
  if (current.idleTimer) clearTimeout(current.idleTimer);

  const png = await new Promise<Uint8Array>((resolve, reject) => {
    const timer = setTimeout(() => stopWorker("The background remover took too long and was restarted."), REQUEST_TIMEOUT_MS);
    current.queue.push({ resolve, reject, timer });
    current.process.stdin?.write(encodeRequest(image));
  });

  if (worker === current) current.idleTimer = setTimeout(() => stopWorker("Idle."), IDLE_TIMEOUT_MS);
  return png;
}
