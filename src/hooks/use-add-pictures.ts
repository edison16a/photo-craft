"use client";
/**
 * Adds pictures to the remove background page from files or image links.
 * Whatever can be read goes in; the first failure is shown as a toast.
 */
import { useCallback } from "react";
import { itemFromFile, itemFromUrl } from "../lib/remove-bg/files";
import { useEditorUiStore } from "../store/editor-ui-store";
import { useRemoveBgStore, type RemovalItem } from "../store/remove-bg-store";

async function loadAll<T>(sources: T[], load: (source: T) => Promise<RemovalItem>): Promise<void> {
  if (sources.length === 0) return;
  const results = await Promise.allSettled(sources.map(load));
  const items = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  if (items.length > 0) useRemoveBgStore.getState().addItems(items);
  const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failed) {
    const message = failed.reason instanceof Error ? failed.reason.message : "Could not read that picture.";
    useEditorUiStore.getState().showToast(message, "error");
  }
}

/** Stable functions that add files or image links to the page. */
export function useAddPictures() {
  const addFiles = useCallback((files: File[]) => loadAll(files, itemFromFile), []);
  const addUrls = useCallback((urls: string[]) => loadAll(urls, itemFromUrl), []);
  return { addFiles, addUrls };
}
