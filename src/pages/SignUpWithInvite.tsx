import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { sanitizeUrlParam } from "@/lib/xss";

export default function SignUpWithInvite() {
  const [searchParams] = useSearchParams();
  const inviteToken = sanitizeUrlParam(searchParams.get("invite") ?? searchParams.get("project_invite")); // support both, sanitized
  const navigate = useNavigate();

  // Force light theme on sign up page (no dark mode)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      // Restore user's theme preference when leaving (if stored)
      const stored = localStorage.getItem("visionm-theme");
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!inviteToken);
  const [inviteData, setInviteData] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) { setValidating(false); return; }
    (async () => {
      setValidating(true);
      try {
        const { data: json, error } = await supabase.functions.invoke("validate-invite", {
          body: { token: inviteToken },
        });
        if (error || !json?.ok) {
          setErrorMsg(json?.error || "Invalid invite");
          setValidating(false);
          return;
        }
        setInviteData(json.invite);
        if (json.invite?.invite_email) setEmail(json.invite.invite_email);
      } catch (err:any) {
        setErrorMsg(String(err));
      } finally {
        setValidating(false);
      }
    })();
  }, [inviteToken]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
          },
        },
      });
      
      // Handle specific error cases
      if (error) {
        // Check if error is about user already existing
        if (error.message?.includes("User already registered") || 
            error.message?.includes("already exists") ||
            error.message?.includes("already registered")) {
          setErrorMsg("An account with this email already exists. Please sign in instead. You can use the invite link to sign in and accept the invite.");
          setLoading(false);
          return;
        }
        throw error;
      }

      const user = (data as any)?.user ?? null;
      
      // Check if user exists but is unconfirmed (identities.length === 0)
      // This happens when email confirmation is required and user hasn't confirmed yet
      if (
        user &&
        Array.isArray((user as any).identities) &&
        (user as any).identities.length === 0
      ) {
        setErrorMsg("An account with this email already exists but is not confirmed. Please check your email to confirm your account, then sign in with the invite link to accept the invite.");
        setLoading(false);
        return;
      }
      
      // If your Supabase requires email confirmation, `user` may be null - handle this case:
      if (!user) {
        // inform user to confirm email, and only call accept-invite after confirmation flow.
        setErrorMsg("Sign-up created. Please confirm your email before the invite is accepted.");
        setLoading(false);
        return;
      }

      // Ensure profile row has name and phone so join requests and team members show correct details
      // Retry logic to ensure profile is saved even if trigger hasn't run yet
      let profileSaved = false;
      let retries = 0;
      const maxRetries = 3;
      
      while (!profileSaved && retries < maxRetries) {
        try {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                name: name.trim(),
                phone: phone.trim() || null,
                email: email.trim(),
              },
              { onConflict: "id" }
            );

          if (profileError) {
            console.error(`[SignUpWithInvite] Error upserting profile (attempt ${retries + 1}/${maxRetries}):`, profileError);
            retries++;
            // Wait a bit before retrying (exponential backoff)
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500 * retries));
            }
          } else {
            profileSaved = true;
            console.log("[SignUpWithInvite] Profile upserted successfully");
          }
        } catch (profileErr) {
          console.error(`[SignUpWithInvite] Unexpected error upserting profile (attempt ${retries + 1}/${maxRetries}):`, profileErr);
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
          }
        }
      }
      
      if (!profileSaved) {
        console.warn("[SignUpWithInvite] Failed to upsert profile after retries - trigger should handle it");
      }

      // call accept-invite server function with token and new user.id
      if (inviteToken) {
        if (!inviteToken.trim() || !user.id) {
          console.warn("Skipping accept-invite after sign-up due to missing token or userId", {
            hasToken: !!inviteToken,
            hasUserId: !!user.id,
          });
        } else {
        const { data: acceptJson, error: acceptError } = await supabase.functions.invoke("accept-invite", {
            body: { token: inviteToken.trim(), userId: user.id },
          });
          const accepted = acceptJson?.ok || acceptJson?.error === "invite already accepted";
          if (accepted) {
            // all good - redirect
            navigate("/dashboard");
            return;
          }
          if (acceptError || !acceptJson?.ok) {
            setErrorMsg(acceptJson?.error || "Failed to accept invite");
            setLoading(false);
            return;
          }
        }
      }

      navigate("/dashboard");
    } catch (err:any) {
      setErrorMsg(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  if (validating) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Validating invite...</div>;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        className="max-w-md w-full"
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-2xl font-bold mb-4 text-foreground">Create account</h2>

        {errorMsg && <div className="text-destructive mb-4">{errorMsg}</div>}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Full name</Label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Phone number <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Password</Label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
