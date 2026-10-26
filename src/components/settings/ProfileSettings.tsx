import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userProfileSchema } from "@/lib/validations/authSchemas";
import { SettingsCard, SettingsSection } from "./SettingsSection";

const profileFields = userProfileSchema.pick({ name: true, phone: true });

/** Your name and phone; the login email is shown but can't be changed */
export const ProfileSettings: React.FC = () => {
  const { profile, user, reloadProfile } = useProfile();
  const { toast } = useToast();
  const savedName = profile?.name || (user?.user_metadata?.name as string) || "";
  const savedPhone = profile?.phone || (user?.user_metadata?.phone as string) || "";
  const [name, setName] = useState(savedName);
  const [phone, setPhone] = useState(savedPhone);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(savedName);
    setPhone(savedPhone);
  }, [savedName, savedPhone]);

  const changed = name.trim() !== savedName.trim() || phone.trim() !== savedPhone.trim();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileFields.safeParse({ name: name.trim(), phone: phone.trim() });
    if (!parsed.success) {
      const next: { name?: string; phone?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as "name" | "phone";
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: parsed.data.name, phone: parsed.data.phone })
        .eq("id", profile.id);
      if (error) throw error;
      await reloadProfile();
      toast({ title: "Saved", description: "Your profile is updated." });
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="My profile" intro="How you appear to your team. Only you can change these.">
      <SettingsCard>
        <form className="space-y-4" onSubmit={save} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Name</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Phone</Label>
            <Input
              id="settings-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Login email</Label>
            <Input id="settings-email" value={user?.email ?? profile?.email ?? ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">You sign in with this email. It can't be changed.</p>
          </div>
          <div className="flex justify-end gap-2">
            {changed && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName(savedName);
                  setPhone(savedPhone);
                  setErrors({});
                }}
                disabled={saving}
              >
                Undo changes
              </Button>
            )}
            <Button type="submit" disabled={!changed || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </SettingsCard>
    </SettingsSection>
  );
};
