import { useState, useCallback } from "react";

const STORAGE_KEY = "annotationShortcutKeys";

export interface ShortcutKeys {
  previousImage: string;
  nextImage: string;
  drawMode: string;
  clickToMask: string;
  copyBoxes: string;
  pasteBoxes: string;
}

export const DEFAULT_SHORTCUT_KEYS: ShortcutKeys = {
  previousImage: "a",
  nextImage: "d",
  drawMode: "w",
  clickToMask: "m",
  copyBoxes: "ctrl+c",
  pasteBoxes: "ctrl+v",
};

function loadFromStorage(): ShortcutKeys {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUT_KEYS;
    const parsed = JSON.parse(raw) as Partial<ShortcutKeys>;
    return { ...DEFAULT_SHORTCUT_KEYS, ...parsed };
  } catch {
    return DEFAULT_SHORTCUT_KEYS;
  }
}

export function useShortcutKeys() {
  const [keys, setKeys] = useState<ShortcutKeys>(loadFromStorage);

  const saveKeys = useCallback((updated: ShortcutKeys) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
    setKeys(updated);
  }, []);

  const resetToDefaults = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setKeys(DEFAULT_SHORTCUT_KEYS);
  }, []);

  return { keys, saveKeys, resetToDefaults };
}

/**
 * Given a KeyboardEvent and a shortcut string like "a" or "ctrl+c",
 * return true if the event matches.
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split("+");
  const hasCtrl = parts.includes("ctrl");
  const hasMeta = parts.includes("meta");
  const hasMod = hasCtrl || hasMeta;
  const hasShift = parts.includes("shift");
  const keyPart = parts.filter((p) => !["ctrl", "meta", "shift", "alt"].includes(p)).join("+");

  if (hasMod && !e.ctrlKey && !e.metaKey) return false;
  if (!hasMod && (e.ctrlKey || e.metaKey)) return false;
  if (hasShift && !e.shiftKey) return false;
  if (!hasShift && e.shiftKey) return false;
  return e.key.toLowerCase() === keyPart;
}
