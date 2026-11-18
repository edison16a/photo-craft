/**
 * What a bound key does. Tool keys pick the tool; the background and
 * chroma key keys work on the selected image, if there is exactly one.
 */
import type { KeybindAction } from "../lib/keybinds";
import { isBackgroundRemovalSupported } from "../services/background-removal";
import { selectedImage, toggleBackground } from "./background-actions";
import { toggleColorPick } from "./chroma-key-actions";
import { useEditorUiStore } from "./editor-ui-store";

/** Runs the action a key is bound to. */
export function runKeybindAction(action: KeybindAction): void {
  if (action === "removeBackground") {
    const image = selectedImage();
    if (image && isBackgroundRemovalSupported()) void toggleBackground(image);
    return;
  }
  if (action === "chromaKey") {
    const image = selectedImage();
    if (image) toggleColorPick(image.id);
    return;
  }
  useEditorUiStore.getState().setTool(action);
}
