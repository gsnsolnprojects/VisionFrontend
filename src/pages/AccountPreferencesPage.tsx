import React from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/pages/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Palette, Check } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { useColorTheme } from "@/hooks/useColorTheme";
import type { ColorTheme } from "@/lib/colorTheme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: {
  value: ColorTheme;
  label: string;
  description: string;
  swatch: { background: string; border: string; primary: string; accent: string; dark: string };
}[] = [
  {
    value: "vision",
    label: "Vision (default)",
    description: "Cream, ink and lime.",
    swatch: { background: "#f5f5ee", border: "#d9ded3", primary: "#171c1b", accent: "#e9ff65", dark: "#171f1b" },
  },
  {
    value: "classic",
    label: "Classic",
    description: "The original blue look.",
    swatch: { background: "#ffffff", border: "#e2e8f0", primary: "#0369a1", accent: "#0ea5e9", dark: "#0f172a" },
  },
];

export const AccountPreferencesPage: React.FC = () => {
  const { colorTheme, setColorTheme, saving } = useColorTheme();

  return (
    <div>
      <PageHeader
        title="Preferences"
        description="Customize your app experience"
      />

      <motion.div className="space-y-4" variants={fadeInUpVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notification settings coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Colour theme">
              {THEME_OPTIONS.map((option) => {
                const selected = colorTheme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={saving}
                    onClick={() => !selected && setColorTheme(option.value)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      "hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-foreground ring-1 ring-foreground" : "border-border"
                    )}
                  >
                    {/* Fixed preview colours so each option shows its own palette */}
                    <div
                      className="mb-3 flex h-16 items-end gap-2 rounded-md border p-2"
                      style={{ background: option.swatch.background, borderColor: option.swatch.border }}
                    >
                      <span className="h-6 w-16 rounded" style={{ background: option.swatch.primary }} />
                      <span className="h-6 w-8 rounded" style={{ background: option.swatch.accent }} />
                      <span className="ml-auto h-10 w-10 rounded" style={{ background: option.swatch.dark }} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{option.label}</span>
                      {selected && <Check className="h-4 w-4" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Saved to your account. Use the sun / moon button in the top bar to switch between light and dark mode.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};






