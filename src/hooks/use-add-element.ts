"use client";
/**
 * Adds new elements to the current page, placed in the centre and sized to
 * suit the page. Used by the tool panels and by drag and drop.
 */
import { useCallback } from "react";
import { createImageElement, createShapeElement, createTextElement } from "../model/element-factories";
import type { ShapeKind, TextElement } from "../model/types";
import { clamp, scaleToFit } from "../lib/geometry";
import { importImageFile, importImageFromUrl, type LoadedImage } from "../lib/image-loading";
import { ensureFontLoaded } from "../lib/font-loader";
import { useEditorUiStore } from "../store/editor-ui-store";
import { useProjectStore } from "../store/project-store";

/** Position that centres a box of the given size on the page. */
function centred(page: { width: number; height: number }, width: number, height: number) {
  return { x: Math.round((page.width - width) / 2), y: Math.round((page.height - height) / 2) };
}

export function useAddElement() {
  const addText = useCallback(async (partial: Partial<Omit<TextElement, "type">> = {}) => {
    const { project, addElement } = useProjectStore.getState();
    if (!project) return;
    const fontSize = partial.fontSize ?? clamp(Math.round(project.width / 16), 16, 240);
    const width = partial.width ?? Math.round(project.width * 0.7);
    const height = partial.height ?? Math.round(fontSize * 1.3);
    const element = createTextElement({ fontSize, width, height, ...centred(project, width, height), ...partial });
    await ensureFontLoaded(element.fontFamily);
    addElement(element);
    const ui = useEditorUiStore.getState();
    ui.setTool("select");
    ui.openPanel("properties");
    ui.setEditingText(element.id);
    return element;
  }, []);

  const addShape = useCallback((shape: ShapeKind) => {
    const { project, addElement } = useProjectStore.getState();
    if (!project) return;
    const size = Math.round(Math.min(project.width, project.height) * 0.35);
    const isLine = shape === "line" || shape === "arrow";
    const width = isLine ? Math.round(project.width * 0.4) : size;
    const height = isLine ? Math.max(24, Math.round(size * 0.1)) : size;
    addElement(createShapeElement(shape, { width, height, ...centred(project, width, height) }));
    useEditorUiStore.getState().setTool("select");
    useEditorUiStore.getState().openPanel("properties");
  }, []);

  const addLoadedImage = useCallback((image: LoadedImage, at?: { x: number; y: number }) => {
    const { project, addElement } = useProjectStore.getState();
    if (!project) return;
    const fitted = scaleToFit(image.width, image.height, project.width * 0.7, project.height * 0.7);
    const position = at
      ? { x: Math.round(at.x - fitted.width / 2), y: Math.round(at.y - fitted.height / 2) }
      : centred(project, fitted.width, fitted.height);
    addElement(createImageElement(image.src, image.width, image.height, { ...fitted, ...position }));
    useEditorUiStore.getState().setTool("select");
    useEditorUiStore.getState().openPanel("properties");
  }, []);

  const addImageFile = useCallback(
    async (file: File, at?: { x: number; y: number }) => {
      const { showToast } = useEditorUiStore.getState();
      try {
        addLoadedImage(await importImageFile(file), at);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not import that image", "error");
      }
    },
    [addLoadedImage],
  );

  /** Adds an image from a URL. Resolves with false (and a toast unless quiet) when it fails. */
  const addImageUrl = useCallback(
    async (url: string, at?: { x: number; y: number }, quiet = false): Promise<boolean> => {
      const { showToast } = useEditorUiStore.getState();
      try {
        addLoadedImage(await importImageFromUrl(url), at);
        return true;
      } catch (error) {
        if (!quiet) showToast(error instanceof Error ? error.message : "Could not load that image", "error");
        return false;
      }
    },
    [addLoadedImage],
  );

  return { addText, addShape, addLoadedImage, addImageFile, addImageUrl };
}
