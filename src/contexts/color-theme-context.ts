// src/contexts/color-theme-context.ts
import { createContext } from "react";
import type { ColorTheme } from "@/lib/colorTheme";

export type ColorThemeContextType = {
  colorTheme: ColorTheme;
  /** Apply a theme now and save it to the signed-in user's profile. */
  setColorTheme: (theme: ColorTheme) => Promise<void>;
  saving: boolean;
};

// Only export the context here (no components in this file)
export const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);
