/**
 * The pick tap with a stand in Konva event, checking it cancels the touch
 * so no mouse events follow it.
 */
import type { KonvaEventObject } from "konva/lib/Node";
import { describe, expect, it, vi } from "vitest";
import { pickColorAt } from "@/store/chroma-key-actions";
import { screenToPage } from "@/store/viewport-actions";
import { pickOnTouch } from "./pick-touch";

vi.mock("@/store/chroma-key-actions", () => ({ pickColorAt: vi.fn() }));

function tap(cancelable: boolean) {
  const evt = { cancelable, preventDefault: vi.fn() };
  const stage = { getPointerPosition: () => ({ x: 10, y: 20 }) };
  pickOnTouch({ evt, target: { getStage: () => stage } } as unknown as KonvaEventObject<TouchEvent>);
  return evt.preventDefault;
}

describe("pick tap", () => {
  it("cancels the touch and picks at the tapped point", () => {
    expect(tap(true)).toHaveBeenCalled();
    expect(pickColorAt).toHaveBeenCalledWith(screenToPage({ x: 10, y: 20 }));
  });

  it("leaves a touch that cannot be cancelled alone", () => {
    expect(tap(false)).not.toHaveBeenCalled();
  });
});
