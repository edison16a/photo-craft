import { describe, expect, it } from "vitest";
import { pagePointToPicturePixel, type PictureBox } from "./picture-point";

const BOX: PictureBox = { x: 100, y: 50, width: 200, height: 100, rotation: 0, flipX: false, flipY: false };
/** Twice the size of the box, so each page pixel covers two picture pixels. */
const PICTURE = { width: 400, height: 200 };

/** Where a point in the unrotated, unflipped box lands on the page, the way Konva draws it. */
function toPage(box: PictureBox, local: { x: number; y: number }) {
  const x = box.flipX ? box.width - local.x : local.x;
  const y = box.flipY ? box.height - local.y : local.y;
  const rad = (box.rotation * Math.PI) / 180;
  const dx = x - box.width / 2;
  const dy = y - box.height / 2;
  return {
    x: box.x + box.width / 2 + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: box.y + box.height / 2 + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

describe("pagePointToPicturePixel", () => {
  it("scales from the box to the natural size", () => {
    expect(pagePointToPicturePixel(BOX, PICTURE, { x: 100.25, y: 50.25 })).toEqual({ x: 0, y: 0 });
    expect(pagePointToPicturePixel(BOX, PICTURE, { x: 150.6, y: 75.3 })).toEqual({ x: 101, y: 50 });
    expect(pagePointToPicturePixel(BOX, PICTURE, { x: 299.9, y: 149.9 })).toEqual({ x: 399, y: 199 });
  });

  it("returns null outside the picture", () => {
    expect(pagePointToPicturePixel(BOX, PICTURE, { x: 99, y: 60 })).toBeNull();
    expect(pagePointToPicturePixel(BOX, PICTURE, { x: 200, y: 150 })).toBeNull();
    expect(pagePointToPicturePixel({ ...BOX, width: 0 }, PICTURE, { x: 100, y: 50 })).toBeNull();
  });

  it("turns the point back around the box centre", () => {
    const turned = { ...BOX, rotation: 90 };
    // Local (10.25, 20.25) sits left of and above the centre; a quarter turn moves it right and up.
    expect(pagePointToPicturePixel(turned, PICTURE, { x: 229.75, y: 10.25 })).toEqual({ x: 20, y: 40 });
    // The unturned spot is now off the picture.
    expect(pagePointToPicturePixel(turned, PICTURE, { x: 110.25, y: 70.25 })).toBeNull();
  });

  it("mirrors flipped pictures", () => {
    expect(pagePointToPicturePixel({ ...BOX, flipX: true }, PICTURE, { x: 110.25, y: 70.25 })).toEqual({ x: 379, y: 40 });
    expect(pagePointToPicturePixel({ ...BOX, flipY: true }, PICTURE, { x: 110.25, y: 70.25 })).toEqual({ x: 20, y: 159 });
    const both = { ...BOX, rotation: 90, flipX: true, flipY: true };
    expect(pagePointToPicturePixel(both, PICTURE, { x: 229.75, y: 10.25 })).toEqual({ x: 379, y: 159 });
  });

  it("finds the same pixel Konva drew there at any angle and flip", () => {
    const local = { x: 37.3, y: 81.6 };
    const expected = { x: Math.floor(local.x * 2), y: Math.floor(local.y * 2) };
    for (const rotation of [0, 30, 135, 200, 315]) {
      for (const flipX of [false, true]) {
        for (const flipY of [false, true]) {
          const box = { ...BOX, rotation, flipX, flipY };
          expect(pagePointToPicturePixel(box, PICTURE, toPage(box, local))).toEqual(expected);
        }
      }
    }
  });
});
