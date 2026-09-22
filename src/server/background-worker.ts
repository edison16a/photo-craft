/**
 * One Python worker process for background removal. Server only.
 *
 * Handles spawning, the ready handshake, framing of requests and replies
 * and every way the process can die. The remover module above it decides
 * when to start and stop a worker.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { decodeResponse, encodeRequest, STATUS_OK } from "./frame-protocol";

/** The worker could not read the image it was given. Not a server fault. */
export class ImageError extends Error {}

interface Pending {
  resolve: (png: Uint8Array) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface WorkerOptions {
  python: string;
  script: string;
  startupTimeoutMs: number;
  requestTimeoutMs: number;
  /** Called once the process is gone, whatever the reason. */
  onExit: (reason: string) => void;
}

/** A running worker. Create with startWorker, talk with send, end with stop. */
export interface BackgroundWorker {
  ready: Promise<void>;
  send: (image: Uint8Array) => Promise<Uint8Array>;
  stop: (reason: string) => void;
  /** True while a request is waiting for its reply. */
  busy: () => boolean;
}

/** Spawns the Python worker and wires up the protocol. */
export function startWorker(options: WorkerOptions): BackgroundWorker {
  const child: ChildProcess = spawn(options.python, [options.script], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  const queue: Pending[] = [];
  const chunks: Buffer[] = [];
  let buffered = 0;
  let announced = false;
  let stopped = false;
  let settleReady: { resolve: () => void; reject: (error: Error) => void } | null = null;
  const ready = new Promise<void>((resolve, reject) => {
    settleReady = { resolve, reject };
  });
  ready.catch(() => undefined);

  const stop = (reason: string) => {
    if (stopped) return;
    stopped = true;
    clearTimeout(startupTimer);
    settleReady?.reject(new Error(reason));
    for (const pending of queue.splice(0)) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    child.kill();
    options.onExit(reason);
  };

  const startupTimer = setTimeout(() => stop("The background remover took too long to start."), options.startupTimeoutMs);

  /** Reads the one line JSON announcement. Skips chatter other libraries print first. */
  const readAnnouncement = (): void => {
    const all = Buffer.concat(chunks);
    const newline = all.indexOf(10);
    if (newline < 0) return;
    const line = all.subarray(0, newline).toString("utf8").trim();
    chunks.length = 0;
    const rest = all.subarray(newline + 1);
    if (rest.length > 0) chunks.push(Buffer.from(rest));
    buffered = rest.length;
    let info: { ready?: boolean; error?: string } | null = null;
    try {
      info = JSON.parse(line) as { ready?: boolean; error?: string };
    } catch {
      console.warn(`[background-remover] ${line}`);
      return readAnnouncement();
    }
    if (info.ready) {
      announced = true;
      clearTimeout(startupTimer);
      settleReady?.resolve();
    } else {
      stop(`The background remover failed to start: ${info.error ?? "unknown error"}`);
    }
  };

  /** Hands complete reply frames to the requests waiting for them. */
  const drain = (): void => {
    while (buffered >= 5) {
      const head = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
      const length = head.readUInt32BE(1);
      if (buffered < 5 + length) return;
      const decoded = decodeResponse(head);
      if (!decoded) return;
      chunks.length = 0;
      const rest = head.subarray(decoded.consumed);
      if (rest.length > 0) chunks.push(Buffer.from(rest));
      buffered = rest.length;
      const pending = queue.shift();
      if (!pending) continue;
      clearTimeout(pending.timer);
      if (decoded.frame.status === STATUS_OK) pending.resolve(decoded.frame.payload);
      else pending.reject(new ImageError(Buffer.from(decoded.frame.payload).toString("utf8")));
    }
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
    buffered += chunk.length;
    if (!announced) readAnnouncement();
    if (announced) drain();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) console.warn(`[background-remover] ${text}`);
  });
  // A dying worker closes its pipe. Writes that race that close must not crash the server.
  child.stdin?.on("error", () => undefined);
  child.on("error", (error) => stop(`The background remover could not be started: ${error.message}`));
  child.on("exit", (code) => stop(`The background remover stopped (exit code ${code ?? "unknown"}).`));

  const send = (image: Uint8Array) =>
    new Promise<Uint8Array>((resolve, reject) => {
      if (stopped) {
        reject(new Error("The background remover is not running."));
        return;
      }
      const timer = setTimeout(() => stop("The background remover took too long and was restarted."), options.requestTimeoutMs);
      queue.push({ resolve, reject, timer });
      child.stdin?.write(encodeRequest(image));
    });

  return { ready, send, stop, busy: () => queue.length > 0 };
}
