import { beforeEach, describe, expect, it } from "vitest";
import { useEditorUiStore } from "./editor-ui-store";

const store = () => useEditorUiStore.getState();

describe("editor ui store busy images", () => {
  beforeEach(() => {
    useEditorUiStore.setState({ busyImageIds: [] });
  });

  it("marks an image busy once and clears it again", () => {
    store().setImageBusy("img", true);
    store().setImageBusy("img", true);
    expect(store().busyImageIds).toEqual(["img"]);
    store().setImageBusy("img", false);
    expect(store().busyImageIds).toEqual([]);
  });

  it("keeps other busy images when one finishes", () => {
    store().setImageBusy("a", true);
    store().setImageBusy("b", true);
    store().setImageBusy("a", false);
    expect(store().busyImageIds).toEqual(["b"]);
  });
});
