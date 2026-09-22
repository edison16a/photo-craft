import { beforeEach, describe, expect, it } from "vitest";
import { nextQueuedItem, useRemoveBgStore, type RemovalItem } from "./remove-bg-store";

const store = () => useRemoveBgStore.getState();

function item(id: string, status: RemovalItem["status"] = "queued"): RemovalItem {
  return { id, name: id, original: new Blob(), originalUrl: `blob:${id}`, width: 10, height: 10, status };
}

describe("remove background store", () => {
  beforeEach(() => {
    store().clear();
  });

  it("shows the first added picture and keeps the selection on later adds", () => {
    store().addItems([item("a"), item("b")]);
    expect(store().selectedId).toBe("a");
    store().addItems([item("c")]);
    expect(store().selectedId).toBe("a");
    expect(store().items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("moves through the pictures and wraps around", () => {
    store().addItems([item("a"), item("b"), item("c")]);
    store().selectNeighbour(1);
    expect(store().selectedId).toBe("b");
    store().selectNeighbour(-1);
    store().selectNeighbour(-1);
    expect(store().selectedId).toBe("c");
  });

  it("tracks each picture through the queue", () => {
    store().addItems([item("a")]);
    store().markWorking("a");
    expect(store().items[0].status).toBe("working");
    const blob = new Blob();
    store().finish("a", blob, "blob:result");
    expect(store().items[0]).toMatchObject({ status: "done", result: blob, resultUrl: "blob:result" });
    store().fail("a", "No luck");
    expect(store().items[0]).toMatchObject({ status: "failed", error: "No luck" });
    store().retry("a");
    expect(store().items[0]).toMatchObject({ status: "queued", error: undefined });
  });

  it("selects the neighbour when the showing picture is removed", () => {
    store().addItems([item("a"), item("b"), item("c")]);
    store().select("b");
    store().remove("b");
    expect(store().selectedId).toBe("c");
    store().remove("c");
    expect(store().selectedId).toBe("a");
    store().remove("a");
    expect(store().selectedId).toBeNull();
    expect(store().items).toEqual([]);
  });

  it("keeps the selection when another picture is removed", () => {
    store().addItems([item("a"), item("b")]);
    store().remove("b");
    expect(store().selectedId).toBe("a");
  });

  it("hands out one queued picture at a time", () => {
    expect(nextQueuedItem([item("a", "done"), item("b"), item("c")])?.id).toBe("b");
    expect(nextQueuedItem([item("a", "working"), item("b")])).toBeUndefined();
    expect(nextQueuedItem([item("a", "failed")])).toBeUndefined();
  });
});
