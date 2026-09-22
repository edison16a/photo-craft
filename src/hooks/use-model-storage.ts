"use client";
/**
 * Which cutout models are on this computer, plus choosing one and
 * deleting them. Choosing a different model removes the one chosen before,
 * so only one lives on the computer at a time.
 */
import { useCallback, useEffect, useState } from "react";
import { deleteModelBytes, isModelCached, MODEL_TIERS, type ModelTier } from "../lib/background/model";
import { forgetLoadedModel } from "../services/background-removal";
import { loadSettings, saveSettings, subscribeToSettings } from "../services/settings";

type CachedByTier = Record<ModelTier, boolean>;

const NONE: CachedByTier = { light: false, effective: false, best: false };

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

async function readCached(): Promise<CachedByTier> {
  const flags = await Promise.all(MODEL_TIERS.map((tier) => isModelCached(tier, origin()).catch(() => false)));
  return { light: flags[0], effective: flags[1], best: flags[2] };
}

/** The chosen model, which ones are downloaded, and actions to change that. */
export function useModelStorage() {
  const [chosen, setChosen] = useState<ModelTier>("best");
  const [cached, setCached] = useState<CachedByTier>(NONE);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setChosen(loadSettings().backgroundModel);
    setCached(await readCached());
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeToSettings((settings) => setChosen(settings.backgroundModel));
  }, [refresh]);

  /** Removes one model from this computer. The next use downloads it again. */
  const remove = useCallback(
    async (tier: ModelTier) => {
      setBusy(true);
      try {
        await deleteModelBytes(tier, origin());
        forgetLoadedModel();
        setCached(await readCached());
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /** Makes a model the one to use and removes the one used before. */
  const choose = useCallback(
    async (tier: ModelTier) => {
      const previous = loadSettings().backgroundModel;
      saveSettings({ backgroundModel: tier });
      setChosen(tier);
      if (previous !== tier) await remove(previous);
    },
    [remove],
  );

  return { chosen, cached, busy, choose, remove, refresh };
}
