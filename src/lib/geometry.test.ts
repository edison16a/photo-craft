import { describe, it, expect } from "vitest";
import type { Rect } from "../model/types";
import {
  centerOf,
  clamp,
  degToRad,
  fitScale,
  normalizeDegrees,
  radToDeg,
  rectContainsPoint,
  rectsIntersect,
  resizeKeepingCorner,
  rotatedBoundingBox,
  roundTo,
  scaleToFit,
  unionRects,
} from "./geometry";

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

function expectRectCloseTo(actual: Rect, expected: Rect): void {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.width).toBeCloseTo(expected.width, 6);
  expect(actual.height).toBeCloseTo(expected.height, 6);
}

describe("degToRad and radToDeg", () => {
  it("converts the usual angles and round trips", () => {
    expect(degToRad(0)).toBe(0);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
    expect(radToDeg(Math.PI / 4)).toBeCloseTo(45);
    expect(radToDeg(degToRad(123.4))).toBeCloseTo(123.4);
    expect(degToRad(radToDeg(-2.5))).toBeCloseTo(-2.5);
  });
});

describe("normalizeDegrees", () => {
  it("keeps angles already in range", () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(45)).toBe(45);
    expect(normalizeDegrees(359.5)).toBe(359.5);
  });

  it("wraps values outside the range", () => {
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(720)).toBe(0);
    expect(normalizeDegrees(450)).toBe(90);
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(-360)).toBe(0);
    expect(normalizeDegrees(-450)).toBe(270);
  });

  it("never returns negative zero or a non finite number", () => {
    expect(Object.is(normalizeDegrees(-360), 0)).toBe(true);
    expect(Object.is(normalizeDegrees(-0), 0)).toBe(true);
    expect(normalizeDegrees(Number.NaN)).toBe(0);
    expect(normalizeDegrees(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("clamp", () => {
  it("keeps inside values and pins outside values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe("centerOf", () => {
  it("finds the middle of a box", () => {
    expect(centerOf(rect(10, 20, 100, 50))).toEqual({ x: 60, y: 45 });
    expect(centerOf(rect(-10, -10, 20, 20))).toEqual({ x: 0, y: 0 });
  });
});

describe("rotatedBoundingBox", () => {
  const box = rect(100, 100, 200, 100);

  it("returns the same box for 0, 180 and 360", () => {
    expect(rotatedBoundingBox(box, 0)).toEqual(box);
    expect(rotatedBoundingBox(box, 180)).toEqual(box);
    expect(rotatedBoundingBox(box, 360)).toEqual(box);
  });

  it("swaps the sides for a quarter turn and keeps the centre", () => {
    const expected = rect(150, 50, 100, 200);
    expect(rotatedBoundingBox(box, 90)).toEqual(expected);
    expect(rotatedBoundingBox(box, 270)).toEqual(expected);
    expect(rotatedBoundingBox(box, -90)).toEqual(expected);
    expect(centerOf(rotatedBoundingBox(box, 90))).toEqual(centerOf(box));
  });

  it("grows a square by root two at 45 degrees", () => {
    const square = rect(0, 0, 100, 100);
    const side = 100 * Math.SQRT2;
    const offset = (100 - side) / 2;
    expectRectCloseTo(rotatedBoundingBox(square, 45), rect(offset, offset, side, side));
  });

  it("handles a wide box at 45 degrees", () => {
    const half = (100 + 50) * Math.SQRT1_2;
    const expected = rect(200 - half, 150 - half, half * 2, half * 2);
    expectRectCloseTo(rotatedBoundingBox(box, 45), expected);
    expectRectCloseTo(rotatedBoundingBox(box, -45), expected);
  });
});

describe("unionRects", () => {
  it("gives a zero box for an empty list", () => {
    expect(unionRects([])).toEqual(rect(0, 0, 0, 0));
  });

  it("returns a single box unchanged", () => {
    expect(unionRects([rect(5, 6, 7, 8)])).toEqual(rect(5, 6, 7, 8));
  });

  it("covers every box, including ones at negative positions", () => {
    const result = unionRects([rect(10, 10, 20, 20), rect(-5, 40, 10, 10), rect(50, 0, 10, 5)]);
    expect(result).toEqual(rect(-5, 0, 65, 50));
  });
});

describe("rectsIntersect", () => {
  it("detects overlap and containment", () => {
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
    expect(rectsIntersect(rect(0, 0, 100, 100), rect(20, 20, 10, 10))).toBe(true);
  });

  it("ignores boxes that are apart or merely touching", () => {
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(20, 20, 10, 10))).toBe(false);
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false);
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(0, 10, 10, 10))).toBe(false);
  });
});

describe("rectContainsPoint", () => {
  const box = rect(10, 10, 20, 20);

  it("accepts inside and edge points, rejects outside points", () => {
    expect(rectContainsPoint(box, { x: 15, y: 15 })).toBe(true);
    expect(rectContainsPoint(box, { x: 10, y: 10 })).toBe(true);
    expect(rectContainsPoint(box, { x: 30, y: 30 })).toBe(true);
    expect(rectContainsPoint(box, { x: 9.9, y: 15 })).toBe(false);
    expect(rectContainsPoint(box, { x: 15, y: 30.1 })).toBe(false);
  });
});

describe("fitScale", () => {
  it("uses the limiting axis, honours padding and scales small content up", () => {
    expect(fitScale(1000, 500, 500, 500)).toBe(0.5);
    expect(fitScale(500, 1000, 500, 500)).toBe(0.5);
    expect(fitScale(1000, 500, 500, 500, 50)).toBe(0.4);
    expect(fitScale(100, 100, 1000, 1000)).toBe(10);
  });

  it("never returns zero or a negative number", () => {
    expect(fitScale(1000, 1000, 40, 40, 50)).toBeGreaterThan(0);
    expect(fitScale(1000, 1000, 0, 0)).toBeGreaterThan(0);
    expect(fitScale(0, 0, 500, 500)).toBe(1);
  });
});

describe("scaleToFit", () => {
  it("shrinks while keeping the ratio", () => {
    expect(scaleToFit(2000, 1000, 500, 500)).toEqual({ width: 500, height: 250 });
    expect(scaleToFit(1000, 2000, 500, 500)).toEqual({ width: 250, height: 500 });
  });

  it("never upscales", () => {
    expect(scaleToFit(100, 50, 500, 500)).toEqual({ width: 100, height: 50 });
    expect(scaleToFit(500, 500, 500, 500)).toEqual({ width: 500, height: 500 });
  });

  it("handles empty limits and empty sizes", () => {
    expect(scaleToFit(100, 100, 0, 0)).toEqual({ width: 0, height: 0 });
    expect(scaleToFit(0, 100, 50, 50)).toEqual({ width: 0, height: 50 });
    expect(scaleToFit(100, 0, 50, 50)).toEqual({ width: 50, height: 0 });
    expect(scaleToFit(0, 0, 50, 50)).toEqual({ width: 0, height: 0 });
  });
});

describe("roundTo", () => {
  it("rounds to whole numbers by default", () => {
    expect(roundTo(1.2345)).toBe(1);
    expect(roundTo(2.5)).toBe(3);
  });

  it("rounds to the requested decimals", () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(33.33333, 2)).toBe(33.33);
    expect(roundTo(0.1 + 0.2, 10)).toBe(0.3);
  });

  it("avoids negative zero and passes through non finite input", () => {
    expect(Object.is(roundTo(-0.4), 0)).toBe(true);
    expect(roundTo(Number.NaN)).toBeNaN();
    expect(roundTo(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("resizeKeepingCorner", () => {
  const box: Rect = { x: 100, y: 200, width: 300, height: 60 };

  it("leaves an upright box where it is", () => {
    expect(resizeKeepingCorner(box, 0, 300, 120)).toEqual({ x: 100, y: 200 });
    expect(resizeKeepingCorner(box, 0, 500, 120)).toEqual({ x: 100, y: 200 });
  });

  it("keeps the rotated top left corner in place when the height grows", () => {
    const grown = resizeKeepingCorner(box, 90, 300, 120);
    // At 90 degrees the box hangs to the left, so growing it downwards in
    // its own frame means growing it leftwards on the page.
    expect(grown).toEqual({ x: 70, y: 170 });
    const before = rotatedCorner(box, 90);
    const after = rotatedCorner({ ...box, ...grown, height: 120 }, 90);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("holds for any angle and for width changes too", () => {
    for (const rotation of [30, 45, 135, 200, 315]) {
      const moved = resizeKeepingCorner(box, rotation, 260, 130);
      const before = rotatedCorner(box, rotation);
      const after = rotatedCorner({ ...box, ...moved, width: 260, height: 130 }, rotation);
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y, 6);
    }
  });
});

/** Page position of a box's top left corner after rotating it around its centre. */
function rotatedCorner(rect: Rect, rotationDeg: number) {
  const centre = centerOf(rect);
  const rad = degToRad(rotationDeg);
  const dx = -rect.width / 2;
  const dy = -rect.height / 2;
  return { x: centre.x + dx * Math.cos(rad) - dy * Math.sin(rad), y: centre.y + dx * Math.sin(rad) + dy * Math.cos(rad) };
}
