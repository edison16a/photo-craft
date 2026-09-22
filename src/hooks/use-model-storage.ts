"use client";
/**
 * The picked cutout model, which ones are on this computer, and the
 * actions behind the settings dialog. Picking a model downloads it right
 * away and removes the one picked before, so only one lives on the
 * computer at a time. Deleting the current model also unpicks it, and the
 * next removal falls back to the default and picks that again.
 */
import { useCallback, useEffect, useState } from "react";
import { deleteModelBytes, isModelCached, MODEL_TIERS, type ModelTier } from "../lib/background/model";
import { forgetLoadedModel } from "../services/background-removal";
import { downloadModel } from "../services/model-download";
import { loadSettings, saveSettings, subscribeToSettings } from "../services/settings";

type CachedByTier = Record<ModelTier, boolean>;

/** A download under way: which model and how far along, from 0 to 1. */
export interface ModelDownload {
  tier: ModelTier;
  fraction: number;
}

const NONE: CachedByTier = { light: false, effective: false, best: false };

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

async function readCached(): Promise<CachedByTier> {
  const flags = await Promise.all(MODEL_TIERS.map((tier) => isModelCached(tier, origin()).catch(() => false)));
  return { light: flags[0], effective: flags[1], best: flags[2] };
}

/** Removes a model's bytes and tells the worker to let go of it. */
async function drop(tier: ModelTier): Promise<void> {
  await deleteModelBytes(tier, origin());
  forgetLoadedModel();
}

/** The picked model, which ones are downloaded, and actions to change that. */
export function useModelStorage() {
  const [chosen, setChosen] = useState<ModelTier | null>(null);
  const [cached, setCached] = useState<CachedByTier>(NONE);
  const [download, setDownload] = useState<ModelDownload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setChosen(loadSettings().backgroundModel);
    setCached(await readCached());
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeToSettings((settings) => setChosen(settings.backgroundModel));
  }, [refresh]);

  /** Removes the current model from this computer and unpicks it. */
  const removeCurrent = useCallback(async () => {
    const tier = loadSettings().backgroundModel;
    if (!tier) return;
    setBusy(true);
    try {
      await drop(tier);
      saveSettings({ backgroundModel: null });
      setChosen(null);
      setCached(await readCached());
    } finally {
      setBusy(false);
    }
  }, []);

  /** Picks a model, removes the one picked before and downloads the new one. */
  const choose = useCallback(async (tier: ModelTier) => {
    const previous = loadSettings().backgroundModel;
    saveSettings({ backgroundModel: tier });
    setChosen(tier);
    setError(null);
    setBusy(true);
    try {
      if (previous && previous !== tier) await drop(previous);
      if (!(await isModelCached(tier, origin()))) {
        setDownload({ tier, fraction: 0 });
        await downloadModel(tier, (fraction) => setDownload({ tier, fraction }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download the model.");
    } finally {
      setDownload(null);
      setBusy(false);
      setCached(await readCached());
    }
  }, []);

  return { chosen, cached, download, error, busy, choose, removeCurrent, refresh };
}
