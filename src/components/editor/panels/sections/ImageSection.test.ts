/**
 * Renders the real properties panel with the real stores. Only the network
 * call is mocked, so the test can hold a removal open and poke at the
 * selection while it runs.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createImageElement } from "@/model/element-factories";
import { createProject } from "@/model/project-factories";
import { removeImageBackground } from "@/services/background-removal";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { PropertiesPanel } from "../PropertiesPanel";

vi.mock("@/services/background-removal", () => ({
  BACKGROUND_REMOVAL_ENDPOINT: "/api/background-removal",
  fetchBackgroundRemovalStatus: vi.fn(async () => ({ available: true, model: "u2net" })),
  removeImageBackground: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Result {
  src: string;
  width: number;
  height: number;
}

const ORIGINAL = "data:image/png;base64,ORIGINAL";
const store = () => useProjectStore.getState();

let container: HTMLDivElement;
let root: Root;

/** Lets pending promises and the status hook settle inside act. */
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const button = () => {
  const found = [...container.querySelectorAll("button")].find((b) => /background/i.test(b.textContent ?? ""));
  if (!found) throw new Error("Remove background button not rendered");
  return found;
};

/** A promise the test resolves by hand, standing in for the server round trip. */
function deferred() {
  let resolve: (value: Result) => void = () => {};
  const promise = new Promise<Result>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  vi.mocked(removeImageBackground).mockReset();
  useEditorUiStore.setState({ busyImageIds: [], toast: null });
  store().loadProject(createProject("Test", 800, 600));
  store().addElement(createImageElement(ORIGINAL, 200, 120, { id: "img1" }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(PropertiesPanel));
  });
  await flush();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("ImageSection busy state", () => {
  it("stays busy across deselect and reselect and sends one request", async () => {
    const first = deferred();
    vi.mocked(removeImageBackground).mockReturnValueOnce(first.promise);

    expect(button().disabled).toBe(false);
    await act(async () => {
      button().click();
    });
    expect(button().textContent).toBe("Removing background");
    expect(removeImageBackground).toHaveBeenCalledTimes(1);

    await act(async () => store().clearSelection());
    expect(container.textContent).toContain("Nothing selected.");
    await act(async () => store().selectAll());
    await flush();

    expect(button().disabled).toBe(true);
    expect(button().textContent).toBe("Removing background");
    await act(async () => {
      button().click();
    });
    expect(removeImageBackground).toHaveBeenCalledTimes(1);

    const pastBefore = store().history.past.length;
    await act(async () => first.resolve({ src: "data:image/png;base64,CUTOUT", width: 200, height: 120 }));
    await flush();
    expect(button().disabled).toBe(false);
    expect(button().textContent).toBe("Remove background");
    expect(store().history.past.length - pastBefore).toBe(1);
    expect(useEditorUiStore.getState().toast?.kind).toBe("info");
  });

  it("clears the busy flag when the request fails", async () => {
    vi.mocked(removeImageBackground).mockRejectedValueOnce(new Error("Worker crashed"));
    await act(async () => {
      button().click();
    });
    await flush();
    expect(button().disabled).toBe(false);
    expect(useEditorUiStore.getState().busyImageIds).toEqual([]);
    expect(useEditorUiStore.getState().toast).toEqual({ message: "Worker crashed", kind: "error" });
  });
});
