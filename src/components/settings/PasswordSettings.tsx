import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordSchema } from "@/lib/validations/authSchemas";
import { SettingsCard, SettingsSection } from "./SettingsSection";

const PasswordInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  error?: string;
}> = ({ id, label, value, onChange, autoComplete, error }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

/** Change the sign-in password: checks the current one first */
export const PasswordSettings: React.FC = () => {
  const { user } = useProfile();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = "Enter your current password";
    const rule = passwordSchema.safeParse(next);
    if (!rule.success) found.next = rule.error.issues[0].message;
    else if (next === current) found.next = "Choose a password different from the current one";
    if (confirm !== next) found.confirm = "The two new passwords don't match";
    setErrors(found);
    if (Object.keys(found).length || !user?.email) return;

    setSaving(true);
    try {
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (check.error) {
        setErrors({ current: "That's not your current password" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setCurrent("");
      setNext("");
      setConfirm("");
      toast({ title: "Password changed", description: "Use the new password next time you sign in." });
    } catch (err) {
      toast({ title: "Couldn't change the password", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Password" intro="Change the password you sign in with.">
      <SettingsCard>
        <form className="space-y-4" onSubmit={save} noValidate>
          <PasswordInput
            id="settings-current-password"
            label="Current password"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            error={errors.current}
          />
          <PasswordInput
            id="settings-new-password"
            label="New password"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            error={errors.next}
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            8 to 12 characters, with a capital letter, a small letter, a number and a symbol.
          </p>
          <PasswordInput
            id="settings-confirm-password"
            label="New password again"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={errors.confirm}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !current || !next || !confirm}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change password
            </Button>
          </div>
        </form>
      </SettingsCard>
    </SettingsSection>
  );
};
