import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { updateMyCompany } from "@/lib/api/account";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsCard, SettingsSection } from "./SettingsSection";

/**
 * The company everyone in the workspace shares. The name is read-only: the server files every
 * project, dataset and model under it, so it is changed by GSN only.
 */
export const CompanySettings: React.FC = () => {
  const { company, isAdmin, reloadProfile } = useProfile();
  const { toast } = useToast();
  const savedDescription: string = company?.description ?? "";
  const [description, setDescription] = useState(savedDescription);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDescription(savedDescription), [savedDescription]);

  if (!company) {
    return (
      <SettingsSection title="Organisation" intro="The organisation your account belongs to.">
        <SettingsCard>
          <p className="text-sm text-muted-foreground">Your account isn't part of an organisation yet.</p>
        </SettingsCard>
      </SettingsSection>
    );
  }

  const changed = description.trim() !== savedDescription.trim();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length > 500) {
      toast({ title: "Too long", description: "Keep the description under 500 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateMyCompany({ description: description.trim() || null });
      await reloadProfile();
      toast({ title: "Saved", description: "Organisation details updated." });
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="Organisation"
      intro={
        isAdmin
          ? "Details everyone in your organisation shares. As the admin, you can edit the description."
          : "Details everyone in your organisation shares. Only your organisation admin can change them."
      }
    >
      <SettingsCard>
        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-1.5">
            <Label htmlFor="settings-company-name">Organisation name</Label>
            <Input id="settings-company-name" value={company.name ?? ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">To change the organisation name, contact GSN.</p>
          </div>
          {(company.email || company.admin_email) && (
            <div className="space-y-1.5">
              <Label htmlFor="settings-company-email">Contact email</Label>
              <Input id="settings-company-email" value={company.email || company.admin_email} disabled className="bg-muted" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="settings-company-description">Description</Label>
            <Textarea
              id="settings-company-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin}
              rows={3}
              placeholder={isAdmin ? "What your organisation does (optional)" : "No description"}
              className={isAdmin ? undefined : "bg-muted"}
            />
          </div>
          {isAdmin && (
            <div className="flex justify-end gap-2">
              {changed && (
                <Button type="button" variant="outline" onClick={() => setDescription(savedDescription)} disabled={saving}>
                  Undo changes
                </Button>
              )}
              <Button type="submit" disabled={!changed || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </form>
      </SettingsCard>
    </SettingsSection>
  );
};
