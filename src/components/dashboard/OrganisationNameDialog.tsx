import React, { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCompany, findCompanyByName } from "@/lib/api/account";

/**
 * First step after signing up: just the organisation's name. Names must be unique (the database
 * enforces it, and data is kept apart by name), so a name that's taken is saved as the next free
 * one ("Acme 2") instead of asking the person to join someone else's organisation.
 */

const nameTaken = async (name: string): Promise<boolean> => {
  try {
    return !!(await findCompanyByName(name));
  } catch {
    throw new Error("Couldn't check the name. Please try again.");
  }
};

/** The name as typed, or with the lowest free number after it */
const freeName = async (name: string): Promise<string> => {
  if (!(await nameTaken(name))) return name;
  for (let n = 2; n <= 50; n += 1) {
    const candidate = `${name} ${n}`;
    if (!(await nameTaken(candidate))) return candidate;
  }
  throw new Error("That name is very common. Please add something to it, like your city.");
};

export const OrganisationNameDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  /** Called with the saved name once the organisation exists */
  onCreated: (savedName: string, typedName: string) => Promise<void> | void;
}> = ({ open, onOpenChange, email, onCreated }) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim().replace(/\s+/g, " ");
  const valid = trimmed.length >= 2 && trimmed.length <= 100;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      let saved = await freeName(trimmed);
      let result = await createCompany({ companyName: saved, adminEmail: email });
      // Taken a moment ago by someone else: one more try with the next free name
      if (!result.ok && /already exists/i.test(String(result.error ?? ""))) {
        saved = await freeName(trimmed);
        result = await createCompany({ companyName: saved, adminEmail: email });
      }
      if (!result.ok) {
        throw new Error(result.error || "Couldn't save your organisation. Please try again.");
      }
      await onCreated(saved, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your organisation. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#171f1b] text-[#e9ff65]">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogTitle className="text-xl">Name your organisation</DialogTitle>
          <DialogDescription>Your plan and projects belong to your organisation. You can invite your team later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organisation name</Label>
            <Input
              id="org-name"
              autoFocus
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Components"
              className="h-11 rounded-xl"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" disabled={!valid || saving} className="h-11 w-full rounded-xl bg-[#171f1b] text-white hover:bg-[#171f1b]/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving..." : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
