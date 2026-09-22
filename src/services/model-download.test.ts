import { beforeEach, describe, expect, it, vi } from "vitest";

const loadModelBytes = vi.fn();
vi.mock("../lib/background/model", async () => {
  const actual = await vi.importActual<typeof import("../lib/background/model")>("../lib/background/model");
  return { ...actual, loadModelBytes: (...args: unknown[]) => loadModelBytes(...args) };
});

import { downloadInProgress, downloadModel } from "./model-download";

type Progress = (loaded: number, total: number) => void;

describe("downloadModel", () => {
  // Braces matter: a hook that returns the mock would have it called as a cleanup.
  beforeEach(() => {
    loadModelBytes.mockReset();
  });

  it("reports fractions and clears the in flight download when done", async () => {
    let report: Progress = () => undefined;
    loadModelBytes.mockImplementation((_spec, _origin, onProgress: Progress) => {
      report = onProgress;
      return new Promise((resolve) => setTimeout(() => resolve(new Uint8Array(4)), 0));
    });
    const fractions: number[] = [];
    const promise = downloadModel("light", (fraction) => fractions.push(fraction));
    expect(downloadInProgress("light")).toBe(promise);
    expect(downloadInProgress("best")).toBeNull();
    report(1, 4);
    report(4, 4);
    await promise;
    expect(fractions).toEqual([0.25, 1]);
    expect(downloadInProgress("light")).toBeNull();
    expect(loadModelBytes).toHaveBeenCalledTimes(1);
    expect(loadModelBytes.mock.calls[0][0].tier).toBe("light");
  });

  it("shares one download for the same model while it is under way", async () => {
    loadModelBytes.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(new Uint8Array(1)), 0)));
    const first = downloadModel("best");
    const second = downloadModel("best");
    expect(second).toBe(first);
    await first;
    expect(loadModelBytes).toHaveBeenCalledTimes(1);
    await downloadModel("best");
    expect(loadModelBytes).toHaveBeenCalledTimes(2);
  });

  it("passes a failure on and forgets the download", async () => {
    loadModelBytes.mockRejectedValue(new Error("offline"));
    let caught: unknown = null;
    try {
      await downloadModel("effective");
    } catch (cause) {
      caught = cause;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("offline");
    expect(downloadInProgress("effective")).toBeNull();
  });
});
