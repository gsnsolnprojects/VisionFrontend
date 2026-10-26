import React, { useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShortcutKeysDialog } from "@/components/ShortcutKeysDialog";
import { SettingsCard, SettingsSection } from "./SettingsSection";

/** Keyboard shortcuts used while labelling images */
export const ShortcutSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <SettingsSection title="Shortcut keys" intro="Keys that speed up labelling images (like A, D and W).">
      <SettingsCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Change which key does what in the labelling tool.</p>
          <Button variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
            <Keyboard className="h-4 w-4" /> Change shortcuts
          </Button>
        </div>
      </SettingsCard>
      <ShortcutKeysDialog open={open} onOpenChange={setOpen} />
    </SettingsSection>
  );
};
