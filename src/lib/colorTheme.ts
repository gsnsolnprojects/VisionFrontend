/**
 * Colour theme (palette) selection — separate from light/dark mode.
 *
 * - "vision"  : cream / ink / lime palette (default)
 * - "classic" : original blue palette
 *
 * The palettes live in src/index.css. The chosen theme is stored per user in
 * `profiles.color_theme` and cached in localStorage so the right colours show
 * immediately on page load (before the profile has been fetched).
 */

export type ColorTheme = "vision" | "classic";

export const DEFAULT_COLOR_THEME: ColorTheme = "vision";

const COLOR_THEME_STORAGE_KEY = "visionm-color-theme";

export const isColorTheme = (value: unknown): value is ColorTheme =>
  value === "vision" || value === "classic";

export const getCachedColorTheme = (): ColorTheme => {
  try {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    return isColorTheme(stored) ? stored : DEFAULT_COLOR_THEME;
  } catch {
    return DEFAULT_COLOR_THEME;
  }
};

/** Apply a theme to the document and remember it on this device. */
export const applyColorTheme = (theme: ColorTheme) => {
  const root = document.documentElement;
  if (theme === DEFAULT_COLOR_THEME) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode) — the theme still applies for this session
  }
};
