import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth } from "@/lib/auth/authClient";
import { acceptInvite, validateInvite } from "@/lib/api/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";

export default function SignUpWithInvite() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? searchParams.get("project_invite"); // support both
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
        const json = await validateInvite(inviteToken);
        if (!json?.ok) {
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
      // Signing up from the emailed invite link proves the inbox, so the API signs them in straight away
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
          },
        },
        inviteToken: inviteToken?.trim() || undefined,
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
        throw new Error(error.message);
      }

      // No session: the invite didn't match this email, so the email has to be confirmed first
      if (!data.session) {
        setErrorMsg("Sign-up created. Please confirm your email before the invite is accepted.");
        setLoading(false);
        return;
      }

      // Join the organisation from the invite
      if (inviteToken && inviteToken.trim()) {
        const acceptJson = await acceptInvite(inviteToken.trim());
        const accepted = acceptJson?.ok || acceptJson?.error === "invite already accepted";
        if (!accepted) {
          setErrorMsg(acceptJson?.error || "Failed to accept invite");
          setLoading(false);
          return;
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
              onChange={(e) => {
                // Only allow digits (0-9)
                const filteredValue = e.target.value.replace(/\D/g, "");
                setPhone(filteredValue);
              }}
              placeholder="e.g. 9876543210"
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
