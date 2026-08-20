import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useShortcutKeys, DEFAULT_SHORTCUT_KEYS, type ShortcutKeys } from "@/hooks/useShortcutKeys";
import { Keyboard, RotateCcw } from "lucide-react";

interface ShortcutKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutRow {
  id: keyof ShortcutKeys;
  label: string;
  description: string;
  fixed?: boolean; // true = cannot be remapped (e.g. Esc, Ctrl+Z)
}

const ROWS: ShortcutRow[] = [
  { id: "previousImage", label: "Previous image", description: "Navigate to the previous image" },
  { id: "nextImage", label: "Next image", description: "Navigate to the next image" },
  { id: "drawMode", label: "Draw mode", description: "Open class picker then draw a bounding box" },
  { id: "copyBoxes", label: "Copy boxes", description: "Copy all bounding boxes on the current image" },
  { id: "pasteBoxes", label: "Paste boxes", description: "Paste copied boxes onto the current image" },
];

const FIXED_SHORTCUTS = [
  { label: "Cancel / close", keys: "Esc" },
  { label: "Undo", keys: "Ctrl+Z" },
  { label: "Redo", keys: "Ctrl+Shift+Z" },
  { label: "Save", keys: "Ctrl+S" },
  { label: "Select category 1–9", keys: "1–9" },
  { label: "Prev image (always)", keys: "← Arrow" },
  { label: "Next image (always)", keys: "→ Arrow" },
  { label: "Delete annotation", keys: "Delete" },
];

function formatShortcut(key: string): string {
  return key
    .split("+")
    .map((part) => {
      if (part === "ctrl") return "Ctrl";
      if (part === "meta") return "Cmd";
      if (part === "shift") return "Shift";
      if (part === "alt") return "Alt";
      return part.toUpperCase();
    })
    .join(" + ");
}

export const ShortcutKeysDialog: React.FC<ShortcutKeysDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { keys, saveKeys, resetToDefaults } = useShortcutKeys();
  const { toast } = useToast();

  // Local draft while editing
  const [draft, setDraft] = useState<ShortcutKeys>(keys);
  // Which row is currently being recorded
  const [recording, setRecording] = useState<keyof ShortcutKeys | null>(null);

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      // Re-sync draft to latest saved keys when dialog opens
      setDraft(keys);
      setRecording(null);
    }
    onOpenChange(isOpen);
  }, [keys, onOpenChange]);

  const startRecording = (id: keyof ShortcutKeys) => {
    setRecording(id);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recording) return;

      // Don't allow pure modifier keys
      if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      let combo = "";
      if (e.ctrlKey || e.metaKey) combo += "ctrl+";
      if (e.shiftKey) combo += "shift+";
      combo += e.key.toLowerCase();

      // Disallow Esc (reserved)
      if (combo === "escape") {
        setRecording(null);
        return;
      }

      setDraft((prev) => ({ ...prev, [recording]: combo }));
      setRecording(null);
    },
    [recording]
  );

  const handleSave = () => {
    saveKeys(draft);
    toast({ title: "Shortcut keys saved", description: "Your custom shortcuts are now active." });
    onOpenChange(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setDraft(DEFAULT_SHORTCUT_KEYS);
    toast({ title: "Reset to defaults", description: "All shortcuts restored to default values." });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        className="max-w-lg"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Shortcut Keys</DialogTitle>
              <DialogDescription>
                Customise annotation keyboard shortcuts. Click a key badge then press your desired key.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customisable shortcuts */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customisable
            </p>
            <div className="divide-y divide-border rounded-md border">
              {ROWS.map((row) => {
                const isRecording = recording === row.id;
                const currentKey = draft[row.id];
                return (
                  <div key={row.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startRecording(row.id)}
                      className={`shrink-0 rounded px-2 py-1 text-xs font-mono border transition-colors
                        ${isRecording
                          ? "border-primary bg-primary/10 text-primary animate-pulse"
                          : "border-muted bg-muted hover:border-primary hover:bg-primary/5"
                        }`}
                      title="Click then press a key to remap"
                    >
                      {isRecording ? "Press a key…" : formatShortcut(currentKey)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fixed shortcuts (reference only) */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fixed (not customisable)
            </p>
            <div className="divide-y divide-border rounded-md border">
              {FIXED_SHORTCUTS.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {item.keys}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 mr-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save shortcuts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
