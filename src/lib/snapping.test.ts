import { describe, it, expect } from "vitest";
import { collectSnapLines, computeSnap, type SnapContext } from "./snapping";
import type { Rect } from "../model/types";

/** A 1000 by 800 page with no other elements and a comfortable threshold. */
function emptyPage(overrides: Partial<SnapContext> = {}): SnapContext {
  return {
    pageWidth: 1000,
    pageHeight: 800,
    targets: [],
    threshold: 8,
    ...overrides,
  };
}

function box(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

describe("collectSnapLines", () => {
  it("lists page left, centre and right plus top, middle and bottom", () => {
    const lines = collectSnapLines(emptyPage());
    expect(lines.vertical).toEqual([0, 500, 1000]);
    expect(lines.horizontal).toEqual([0, 400, 800]);
  });

  it("adds each target's edges and centre after the page lines", () => {
    const lines = collectSnapLines(
      emptyPage({ targets: [box(100, 50, 200, 100), box(600, 300, 50, 50)] }),
    );
    expect(lines.vertical).toEqual([0, 500, 1000, 100, 200, 300, 600, 625, 650]);
    expect(lines.horizontal).toEqual([0, 400, 800, 50, 100, 150, 300, 325, 350]);
  });

  it("drops duplicate lines and keeps the first occurrence", () => {
    const lines = collectSnapLines(emptyPage({ targets: [box(0, 0, 1000, 800)] }));
    expect(lines.vertical).toEqual([0, 500, 1000]);
    expect(lines.horizontal).toEqual([0, 400, 800]);
  });
});

describe("computeSnap", () => {
  it("snaps the moving box centre to the page centre on both axes", () => {
    const moving = box(453, 353, 100, 100);
    const result = computeSnap(moving, emptyPage());
    expect(result.dx).toBe(-3);
    expect(result.dy).toBe(-3);
    expect(result.guides).toEqual([
      { orientation: "vertical", position: 500 },
      { orientation: "horizontal", position: 400 },
    ]);
  });

  it("snaps the moving box left edge to another element's right edge", () => {
    const target = box(100, 100, 200, 100);
    const moving = box(305, 500, 80, 40);
    const result = computeSnap(moving, emptyPage({ targets: [target] }));
    expect(result.dx).toBe(-5);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 300 });
  });

  it("snaps the moving box right edge to another element's right edge", () => {
    const target = box(100, 100, 200, 100);
    const moving = box(216, 500, 80, 40);
    const result = computeSnap(moving, emptyPage({ targets: [target] }));
    expect(result.dx).toBe(4);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 300 });
  });

  it("returns zero deltas and no guides when nothing is within threshold", () => {
    const moving = box(230, 210, 60, 60);
    const result = computeSnap(moving, emptyPage({ targets: [box(100, 100, 50, 50)] }));
    expect(result).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("handles one axis snapping while the other does not", () => {
    const moving = box(497, 210, 100, 60);
    const result = computeSnap(moving, emptyPage());
    expect(result.dx).toBe(3);
    expect(result.dy).toBe(0);
    expect(result.guides).toEqual([{ orientation: "vertical", position: 500 }]);
  });

  it("prefers the page centre when a target line is equally close", () => {
    const moving = box(460, 100, 100, 50);
    const targets = [box(0, 300, 520, 20)];
    const result = computeSnap(moving, emptyPage({ targets, threshold: 10 }));
    expect(result.dx).toBe(-10);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 500 });
    expect(result.guides).not.toContainEqual({ orientation: "vertical", position: 520 });
  });

  it("prefers the page centre over the page edges on a three way tie", () => {
    const moving = box(10, 100, 1000, 50);
    const result = computeSnap(moving, emptyPage({ threshold: 10 }));
    expect(result.dx).toBe(-10);
    expect(result.guides).toEqual([{ orientation: "vertical", position: 500 }]);
  });

  it("picks the closest candidate when distances differ", () => {
    const moving = box(506, 100, 100, 50);
    const targets = [box(0, 300, 505, 20)];
    const result = computeSnap(moving, emptyPage({ targets }));
    expect(result.dx).toBe(-1);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 505 });
  });

  it("treats a distance exactly at the threshold as a snap", () => {
    const moving = box(8, 8, 50, 50);
    const result = computeSnap(moving, emptyPage({ threshold: 8 }));
    expect(result.dx).toBe(-8);
    expect(result.dy).toBe(-8);
  });

  it("does not snap when the threshold is zero and nothing lines up exactly", () => {
    const moving = box(1, 1, 50, 50);
    const result = computeSnap(moving, emptyPage({ threshold: 0 }));
    expect(result).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("snaps to a target's centre line vertically", () => {
    const target = box(100, 100, 200, 100);
    const moving = box(600, 147, 50, 10);
    const result = computeSnap(moving, emptyPage({ targets: [target] }));
    expect(result.dy).toBe(-2);
    expect(result.guides).toContainEqual({ orientation: "horizontal", position: 150 });
  });
});
