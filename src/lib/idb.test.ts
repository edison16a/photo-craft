import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isIndexedDbAvailable, openKeyValueStore, type KeyValueStore } from "./idb";
import type { ProjectSummary } from "../model/types";

/** Opens a second, raw connection so tests can inspect what the wrapper created. */
function inspectDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("photo-craft");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function summary(id: string, name = id): ProjectSummary {
  return { id, name, width: 100, height: 50, pageCount: 1, updatedAt: 1 };
}

describe("isIndexedDbAvailable", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is true when the fake IndexedDB is installed", () => {
    expect(isIndexedDbAvailable()).toBe(true);
  });

  it("is false when the global is missing", () => {
    vi.stubGlobal("indexedDB", undefined);
    expect(isIndexedDbAvailable()).toBe(false);
  });
});

// This block must stay above the main one. The shared connection is cached
// after its first success, and once that has happened a missing global has
// nothing left to affect. A failed open is forgotten, so later tests recover.
describe("openKeyValueStore before any connection exists", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects with a readable error when IndexedDB is missing", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(openKeyValueStore("projects").keys()).rejects.toThrow(/not available/);
  });
});

describe("openKeyValueStore", () => {
  let projects: KeyValueStore<ProjectSummary>;
  let summaries: KeyValueStore<ProjectSummary>;

  beforeEach(async () => {
    projects = openKeyValueStore<ProjectSummary>("projects");
    summaries = openKeyValueStore<ProjectSummary>("summaries");
    await Promise.all([projects.clear(), summaries.clear()]);
  });

  it("creates the photo-craft database at version 1 with both stores", async () => {
    await projects.keys();
    const db = await inspectDatabase();
    try {
      expect(db.name).toBe("photo-craft");
      expect(db.version).toBe(1);
      expect(Array.from(db.objectStoreNames).sort()).toEqual(["projects", "summaries"]);
    } finally {
      db.close();
    }
  });

  it("returns undefined for a key that was never set", async () => {
    expect(await projects.get("missing")).toBeUndefined();
  });

  it("round trips a value and hands back a copy", async () => {
    const original = summary("p1", "First");
    await projects.set("p1", original);
    original.name = "Changed after save";
    const loaded = await projects.get("p1");
    expect(loaded).toEqual(summary("p1", "First"));
    expect(loaded).not.toBe(original);
  });

  it("overwrites an existing key", async () => {
    await projects.set("p1", summary("p1", "One"));
    await projects.set("p1", summary("p1", "Two"));
    expect((await projects.get("p1"))?.name).toBe("Two");
    expect(await projects.keys()).toEqual(["p1"]);
  });

  it("removes a key and tolerates removing one that is not there", async () => {
    await projects.set("p1", summary("p1"));
    await projects.remove("p1");
    expect(await projects.get("p1")).toBeUndefined();
    await expect(projects.remove("p1")).resolves.toBeUndefined();
  });

  it("lists keys and values in key order", async () => {
    await projects.set("b", summary("b"));
    await projects.set("c", summary("c"));
    await projects.set("a", summary("a"));
    expect(await projects.keys()).toEqual(["a", "b", "c"]);
    expect((await projects.getAll()).map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("clears everything in one store", async () => {
    await projects.set("a", summary("a"));
    await projects.set("b", summary("b"));
    await projects.clear();
    expect(await projects.keys()).toEqual([]);
    expect(await projects.getAll()).toEqual([]);
  });

  it("keeps the two stores separate", async () => {
    await projects.set("shared", summary("shared", "in projects"));
    await summaries.set("shared", summary("shared", "in summaries"));
    expect((await projects.get("shared"))?.name).toBe("in projects");
    expect((await summaries.get("shared"))?.name).toBe("in summaries");
    await projects.clear();
    expect(await summaries.keys()).toEqual(["shared"]);
  });

  it("handles many writes in flight at once on the shared connection", async () => {
    const ids = Array.from({ length: 25 }, (_, index) => `p${String(index).padStart(2, "0")}`);
    await Promise.all(ids.map((id) => projects.set(id, summary(id))));
    expect(await projects.keys()).toEqual(ids);
    expect(await projects.getAll()).toHaveLength(25);
  });

  it("rejects with a readable Error when a value cannot be stored", async () => {
    const broken = openKeyValueStore<() => void>("projects");
    const failure = broken.set("fn", () => undefined);
    await expect(failure).rejects.toBeInstanceOf(Error);
    await expect(failure).rejects.toThrow(/Could not save "fn" in the "projects" store\./);
    expect(await projects.get("fn")).toBeUndefined();
  });
});
