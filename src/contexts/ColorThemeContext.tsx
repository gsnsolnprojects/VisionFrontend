import { ReactNode, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { applyColorTheme, getCachedColorTheme, isColorTheme, type ColorTheme } from "@/lib/colorTheme";
import { ColorThemeContext } from "./color-theme-context";

/**
 * Keeps the colour theme in sync with the signed-in user's profile
 * (`profiles.color_theme`). Must be rendered inside ProfileProvider.
 */
export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useProfile();
  const { toast } = useToast();
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(getCachedColorTheme);
  const [saving, setSaving] = useState(false);

  const profileTheme: unknown = profile?.color_theme;

  // When the profile loads (or a different user signs in), adopt their saved theme
  useEffect(() => {
    if (!isColorTheme(profileTheme)) return;
    setColorThemeState(profileTheme);
    applyColorTheme(profileTheme);
  }, [profileTheme]);

  const setColorTheme = useCallback(
    async (theme: ColorTheme) => {
      setColorThemeState(theme);
      applyColorTheme(theme);

      if (!user?.id) return;

      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({ color_theme: theme })
        .eq("id", user.id);
      setSaving(false);

      if (error) {
        console.error("[ColorTheme] Failed to save theme to profile:", error);
        toast({
          title: "Theme saved on this device only",
          description: "We couldn't save it to your account. It will apply here, but not on other devices.",
          variant: "destructive",
        });
      }
    },
    [user?.id, toast]
  );

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme, saving }}>
      {children}
    </ColorThemeContext.Provider>
  );
}
