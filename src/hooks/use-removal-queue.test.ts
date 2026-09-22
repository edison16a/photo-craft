/**
 * Drives the queue hook with a fake remover, so the test controls when
 * each cutout finishes and can remove pictures while one is running.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeBackground, type CutOut } from "@/services/background-removal";
import { useRemoveBgStore, type RemovalItem } from "@/store/remove-bg-store";
import { useRemovalQueue } from "./use-removal-queue";

vi.mock("@/services/background-removal", () => ({ removeBackground: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const store = () => useRemoveBgStore.getState();

function item(id: string): RemovalItem {
  return { id, name: id, original: new Blob(), originalUrl: `blob:${id}`, width: 4, height: 4, status: "queued" };
}

/** A promise the test settles by hand, standing in for the worker. */
function deferred() {
  let resolve: (value: CutOut) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<CutOut>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

function Queue() {
  useRemovalQueue();
  return null;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.mocked(removeBackground).mockReset();
  store().clear();
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:result", revokeObjectURL: () => undefined });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(Queue));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("useRemovalQueue", () => {
  it("runs the pictures one after another and records each result", async () => {
    const first = deferred();
    const second = deferred();
    vi.mocked(removeBackground).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await act(async () => store().addItems([item("a"), item("b")]));
    expect(store().items.map((i) => i.status)).toEqual(["working", "queued"]);
    expect(removeBackground).toHaveBeenCalledTimes(1);

    await act(async () => first.resolve({ blob: new Blob(), width: 4, height: 4 }));
    await flush();
    expect(store().items.map((i) => i.status)).toEqual(["done", "working"]);
    expect(store().items[0].resultUrl).toBe("blob:result");

    await act(async () => second.reject(new Error("Model missing")));
    await flush();
    expect(store().items[1]).toMatchObject({ status: "failed", error: "Model missing" });
    expect(removeBackground).toHaveBeenCalledTimes(2);
  });

  it("drops the result of a picture removed while it was running and moves on", async () => {
    const first = deferred();
    const second = deferred();
    vi.mocked(removeBackground).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await act(async () => store().addItems([item("a"), item("b")]));
    await act(async () => store().remove("a"));
    await act(async () => first.resolve({ blob: new Blob(), width: 4, height: 4 }));
    await flush();
    expect(store().items.map((i) => `${i.id}:${i.status}`)).toEqual(["b:working"]);
  });

  it("retries a failed picture when asked", async () => {
    vi.mocked(removeBackground).mockRejectedValueOnce(new Error("No luck")).mockResolvedValueOnce({ blob: new Blob(), width: 4, height: 4 });
    await act(async () => store().addItems([item("a")]));
    await flush();
    expect(store().items[0].status).toBe("failed");
    await act(async () => store().retry("a"));
    await flush();
    expect(store().items[0].status).toBe("done");
  });
});
