// src/components/InviteUserDialog.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FormFieldWrapper } from "@/components/FormFieldWrapper";
import { useFormValidation } from "@/hooks/useFormValidation";
import {
  inviteUserSchema,
  type InviteUserFormData,
} from "@/lib/validations/authSchemas";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
  accessToken: string; // pass supabase session access token
}

export const InviteUserDialog: React.FC<Props> = ({
  companyId,
  accessToken,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownEmail, setCooldownEmail] = useState<string | null>(null);

  const form = useFormValidation({
    schema: inviteUserSchema,
    initialValues: {
      email: "",
      name: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // Countdown timer for local 5-minute cooldown per email
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [cooldownSeconds]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company id missing",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (!form.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before sending the invite.",
        variant: "destructive",
      });
      return;
    }

    const normalizedEmail = form.values.email.trim().toLowerCase();

    // If we are currently in cooldown for this email (based on previous server response), block immediately
    if (cooldownSeconds > 0 && cooldownEmail === normalizedEmail) {
      toast({
        title: "Invite rate limit",
        description: "Please wait a few minutes before inviting this user again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supabaseUrl}/functions/v1/create-invite`;

      // Use fresh session token so Edge Function always receives a valid Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? accessToken ?? supabaseAnonKey;
      if (!token || token === supabaseAnonKey) {
        toast({
          title: "Authentication required",
          description: "Please sign in again and try inviting.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId,
          inviteEmail: normalizedEmail,
          inviteName: form.values.name || undefined,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { raw: text };
      }

      console.log("create-invite response:", res.status, data);

      if (!res.ok || data?.success === false) {
        // Handle backend invite rate limit
        if (data?.errorCode === "INVITE_RATE_LIMIT") {
          const waitSeconds = data?.waitTimeSeconds ?? 5 * 60;
          setCooldownSeconds(waitSeconds);
          setCooldownEmail(normalizedEmail);

          toast({
            title: "Too many invites",
            description:
              data?.error ||
              "You've recently invited this user multiple times. Please wait a few minutes before inviting them again.",
            variant: "destructive",
          });

          return;
        }

        // Extract precise error message with priority
        let errorMessage = "";
        
        // Priority 1: Check for details (most specific)
        if (data?.details) {
          errorMessage = data.error 
            ? `${data.error}: ${data.details}`
            : data.details;
        }
        // Priority 2: Main error message
        else if (data?.error) {
          errorMessage = data.error;
          // Add error code if available
          if (data?.errorCode) {
            errorMessage += ` (Error Code: ${data.errorCode})`;
          }
        }
        // Priority 3: Generic message field
        else if (data?.message) {
          errorMessage = data.message;
        }
        // Priority 4: Check for rate limiting or specific HTTP status messages
        else if (res.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        }
        else if (res.status === 403) {
          errorMessage = "Insufficient permissions. You don't have access to perform this action.";
        }
        else if (res.status === 401) {
          errorMessage = "Authentication failed. Please sign in again.";
        }
        else if (res.status === 404) {
          errorMessage = "Resource not found. Please check and try again.";
        }
        else if (res.status === 400) {
          errorMessage = "Invalid request. Please check your input and try again.";
        }
        // Priority 5: Raw response or status-based fallback
        else if (data?.raw) {
          errorMessage = data.raw;
        }
        else {
          errorMessage = `Invite failed with status ${res.status}`;
        }

        // Log detailed error for debugging
        console.error("Invite error details:", {
          status: res.status,
          error: data?.error,
          details: data?.details,
          errorCode: data?.errorCode,
          message: data?.message,
          fullResponse: data,
        });

        toast({
          title: "Invite failed",
          description: errorMessage,
          variant: "destructive",
        });
        if (data?.inviteLink) {
          console.log("Manual invite link:", data.inviteLink);
          setLastInviteLink(data.inviteLink);
        }
        return;
      }

      // success
      if (data?.inviteLink) {
        setLastInviteLink(data.inviteLink);
      }

      form.resetForm();
      toast({
        title: "Invite sent",
        description: "The invitation has been sent successfully.",
      });
    } catch (err: any) {
      console.error("Invite network/parsing error:", err);
      
      // Handle network errors specifically
      let errorMessage = "Something went wrong. Please try again.";
      
      if (err?.message) {
        // Check for network-related errors
        if (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("Failed to fetch")) {
          errorMessage = "Network error: Unable to connect to the server. Please check your internet connection and try again.";
        }
        // Check for timeout errors
        else if (err.message.includes("timeout") || err.message.includes("aborted")) {
          errorMessage = "Request timed out. Please try again.";
        }
        // Check for CORS errors
        else if (err.message.includes("CORS") || err.message.includes("cross-origin")) {
          errorMessage = "Connection error: Please refresh the page and try again.";
        }
        // Use the error message if it's specific
        else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: "Invite failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!lastInviteLink) return;
    navigator.clipboard
      .writeText(lastInviteLink)
      .then(() => alert("Invite link copied"))
      .catch(() => alert("Failed to copy invite link"));
  }

  const normalizedEmail = form.values.email.trim().toLowerCase();
  const isOnCooldown =
    cooldownSeconds > 0 && cooldownEmail === normalizedEmail && !!normalizedEmail;

  return (
    <div className="space-y-4">
      {/* FORM SECTION */}
      <form
        onSubmit={handleInvite}
        className="space-y-4"
      >
        <FormFieldWrapper
          label="Email"
          name="email"
          type="email"
          value={form.values.email}
          onChange={form.handleChange("email")}
          onBlur={form.handleBlur("email")}
          error={form.getFieldError("email")}
          touched={form.isFieldTouched("email")}
            placeholder="user@example.com"
            required
        />

        <FormFieldWrapper
          label="Name (Optional)"
          name="name"
          type="text"
          value={form.values.name || ""}
          onChange={form.handleChange("name")}
          onBlur={form.handleBlur("name")}
          error={form.getFieldError("name")}
          touched={form.isFieldTouched("name")}
            placeholder="Optional name"
          />

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || isOnCooldown}>
            {loading
              ? "Sending..."
              : isOnCooldown
              ? `Invite (available in ${Math.max(cooldownSeconds, 0)}s)`
              : "Invite"}
          </Button>
        </div>
      </form>

      {/* LAST INVITE LINK + COPY BUTTON BELOW INPUTS */}
      {lastInviteLink && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Last invite link:</span>
          <div className="flex items-center gap-2">
            <a
              href={lastInviteLink}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 underline break-all"
            >
              {lastInviteLink}
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteUserDialog;