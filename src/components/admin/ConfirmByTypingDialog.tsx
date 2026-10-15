import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmByTypingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will happen, shown as a list */
  consequences: string[];
  /** The text the admin must type exactly (case-insensitive) */
  confirmText: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (typed: string) => void;
}

/** Permanent actions: the admin has to type a name / email before the button unlocks */
export const ConfirmByTypingDialog: React.FC<ConfirmByTypingDialogProps> = ({
  open,
  onOpenChange,
  title,
  consequences,
  confirmText,
  confirmLabel,
  busy,
  onConfirm,
}) => {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const matches = typed.trim().toLowerCase() === confirmText.trim().toLowerCase();

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>This cannot be undone. It will:</p>
              <ul className="list-disc space-y-1 pl-5">
                {consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-by-typing">
            Type <span className="font-semibold text-foreground">{confirmText}</span> to confirm
          </Label>
          <Input
            id="confirm-by-typing"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches || busy} onClick={() => onConfirm(typed.trim())}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
