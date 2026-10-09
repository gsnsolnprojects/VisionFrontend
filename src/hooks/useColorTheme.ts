import { useContext } from "react";
import { ColorThemeContext } from "@/contexts/color-theme-context";

export function useColorTheme() {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return ctx;
}
