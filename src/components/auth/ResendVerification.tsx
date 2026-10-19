import React, { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const COOLDOWN_SECONDS = 60;

/**
 * Email box + "Resend verification email" button with a 60 s cooldown.
 * Used on the expired-link page and on sign-in when the email isn't confirmed yet.
 */
export const ResendVerification: React.FC<{ initialEmail?: string }> = ({ initialEmail = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setEmail(initialEmail), [initialEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setResult({ ok: false, text: "Enter the email address you signed up with." });
      return;
    }
    setSending(true);
    setResult(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: address,
      options: { emailRedirectTo: `${window.location.origin.replace(/\/+$/, "")}/verify-email` },
    });
    setSending(false);
    if (error) {
      setResult({ ok: false, text: error.message || "Could not send the email. Please try again." });
      return;
    }
    setCooldown(COOLDOWN_SECONDS);
    setResult({
      ok: true,
      text: `If ${address} still needs verifying, a new link is on its way. Check your inbox and spam folder.`,
    });
  };

  return (
    <div className="space-y-2 text-left">
      <Input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address for the verification link"
      />
      <Button type="button" variant="outline" className="w-full gap-2" onClick={resend} disabled={sending || cooldown > 0}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
      </Button>
      {result && (
        <p role="status" className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {result.text}
        </p>
      )}
    </div>
  );
};
