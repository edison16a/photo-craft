/**
 * One Python worker process for background removal. Server only.
 *
 * Handles spawning, the ready handshake, framing of requests and replies
 * and every way the process can die. The remover module above it decides
 * when to start and stop a worker.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { encodeRequest, STATUS_OK } from "./frame-protocol";
import { FrameReader } from "./frame-reader";

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
  /** Stdout before the ready line: chatter from libraries, then the announcement. */
  let banner: Buffer[] = [];
  const replies = new FrameReader();
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
    const all = Buffer.concat(banner);
    const newline = all.indexOf(10);
    if (newline < 0) return;
    const line = all.subarray(0, newline).toString("utf8").trim();
    const rest = all.subarray(newline + 1);
    banner = [rest];
    let info: { ready?: boolean; error?: string } | null = null;
    try {
      info = JSON.parse(line) as { ready?: boolean; error?: string };
    } catch {
      console.warn(`[background-remover] ${line}`);
      return readAnnouncement();
    }
    if (info.ready) {
      announced = true;
      banner = [];
      // Anything after the ready line is already the start of the first reply.
      replies.push(rest);
      clearTimeout(startupTimer);
      settleReady?.resolve();
    } else {
      stop(`The background remover failed to start: ${info.error ?? "unknown error"}`);
    }
  };

  /** Hands complete reply frames to the requests waiting for them. */
  const drain = (): void => {
    for (let frame = replies.next(); frame; frame = replies.next()) {
      const pending = queue.shift();
      if (!pending) continue;
      clearTimeout(pending.timer);
      if (frame.status === STATUS_OK) pending.resolve(frame.payload);
      else pending.reject(new ImageError(Buffer.from(frame.payload).toString("utf8")));
    }
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    if (announced) {
      replies.push(chunk);
    } else {
      banner.push(chunk);
      readAnnouncement();
    }
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
