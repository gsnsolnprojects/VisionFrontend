import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldWrapper } from "@/components/FormFieldWrapper";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { PasswordInput } from "@/components/PasswordInput";
import { useFormValidation } from "@/hooks/useFormValidation";
import {
  signupSchema,
  signinSchema,
  resetPasswordSchema,
  validatePhoneNumber,
  phoneRules,
  type SignupFormData,
  type SigninFormData,
  type ResetPasswordFormData,
} from "@/lib/validations/authSchemas";
import { fadeInUpVariants } from "@/utils/animations";

const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { error: profileError } = useProfile();
  const isDeactivated = profileError?.toLowerCase().includes("deactivated") ?? false;

  // Force light theme on auth pages (no dark mode)
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
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  
  // Get invite token from URL if present
  const inviteToken = searchParams.get("invite") ?? searchParams.get("project_invite");
  
  // Force signin mode when invite token is present
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(() => {
    if (inviteToken) return "signin"; // Force signin mode for invites
    return (searchParams.get("mode") as "signin" | "signup" | "forgot") || "signin";
  });

  // Helper function to normalize URLs (remove trailing slashes)
  const normalizeUrl = (url: string): string => {
    return url.replace(/\/+$/, '');
  };

  // Force signin mode when invite token is present (prevent mode switching)
  useEffect(() => {
    if (inviteToken && mode !== "signin") {
      setMode("signin");
    }
  }, [inviteToken, mode]);

  // Restore signup verification resend cooldown from localStorage on mount
  useEffect(() => {
    try {
      const storedReadyAt = localStorage.getItem("signup-resend-ready-at");
      if (!storedReadyAt) return;

      const readyAt = parseInt(storedReadyAt, 10);
      if (Number.isNaN(readyAt)) {
        localStorage.removeItem("signup-resend-ready-at");
        return;
      }

      const now = Date.now();
      if (readyAt <= now) {
        localStorage.removeItem("signup-resend-ready-at");
        return;
      }

      const secondsRemaining = Math.ceil((readyAt - now) / 1000);
      if (secondsRemaining > 0) {
        setResendCooldown(secondsRemaining);
      } else {
        localStorage.removeItem("signup-resend-ready-at");
      }
    } catch {
      // If anything goes wrong reading storage, fail silently
    }
  }, []);

  // Countdown effect for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("signup-resend-ready-at");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [resendCooldown]);

  // Listen for auth state changes to handle invite acceptance after magic link sign-in
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // When user signs in via magic link or confirms email, check for pending invites
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        // Small delay to ensure session is fully established
        setTimeout(() => {
          // If invite token in URL, use it
          if (inviteToken) {
            handleInviteAcceptanceAfterSignIn();
          } else {
            // No invite token in URL - check if user has pending invite in metadata
            // This handles the case where user confirms via Supabase's "Confirm your signup" email
            checkForPendingInviteFromMetadata(session.user);
          }
        }, 500);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  // Auto-trigger signInWithOtp if invite token present and no session

useEffect(() => {
  if (!inviteToken) return;

  const checkSessionAndTriggerOtp = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If no session and invite token exists, validate invite and trigger OTP
    if (!session) {
      try {
        // Validate invite to get email
        const { data: validateJson, error: validateError } = await supabase.functions.invoke("validate-invite", {
          body: { token: inviteToken },
        });

        // validate-invite returns invite.invite_email
        const inviteEmail =
          !validateError && validateJson?.ok
            ? validateJson.invite?.invite_email ?? validateJson.invite?.email
            : null;

        if (inviteEmail) {
          // Prefill email in signin form
          signinForm.setValue("email", inviteEmail);

          // Trigger signInWithOtp automatically
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: inviteEmail,
            options: {
              emailRedirectTo: `${normalizeUrl(
                window.location.origin
              )}/auth?invite=${encodeURIComponent(inviteToken)}`,
            },
          });

          if (otpError) {
            console.error("Auto OTP trigger error:", otpError);
            // Don't show error - user can still sign in manually
          } else {
            toast({
              title: "Magic link sent",
              description: `A sign-in link has been sent to ${inviteEmail}. Check your email and click the link to sign in and accept the invite.`,
            });
          }
        }
      } catch (error) {
        console.error("Error validating invite for auto OTP:", error);
        // Don't block user - they can still sign in manually
      }
    } else {
      // Session exists - check if we need to accept invite
      // This handles the case where user clicked magic link and is already signed in
      handleInviteAcceptanceAfterSignIn();
    }
  };

  checkSessionAndTriggerOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [inviteToken]);


  // Check for pending invite from user metadata (when user confirms via Supabase email)
  const checkForPendingInviteFromMetadata = async (user: any) => {
    if (!user?.user_metadata?.invite_token) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const inviteTokenFromMetadata = user.user_metadata.invite_token;
      
      // Accept the invite using token from metadata
      const { data: acceptJson, error: acceptError } = await supabase.functions.invoke("accept-invite", {
        body: { token: inviteTokenFromMetadata, userId: user.id },
      });
      
      if (!acceptError && acceptJson?.ok) {
        toast({
          title: "Invite accepted",
          description: "You have been added to the company. Redirecting to dashboard...",
        });
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        console.error("Invite acceptance from metadata failed:", acceptJson?.error);
      }
    } catch (error) {
      console.error("Error checking for pending invite from metadata:", error);
    }
  };

  // Handle invite acceptance after sign-in (for magic link flow)
 const handleInviteAcceptanceAfterSignIn = async () => {
  if (!inviteToken) return;

  try {
    // Wait for session to be fully established after magic link sign-in
    // Magic link sign-in happens via URL hash, so we need to wait for it to be processed
    let session = null;
    let retries = 0;
    const maxRetries = 10;
    
    while (!session && retries < maxRetries) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        session = data.session;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      retries++;
    }

    if (!session?.user || !session?.access_token) {
      console.warn("Session or access token not available after magic link sign-in");
      // Try again after a longer delay
      setTimeout(() => handleInviteAcceptanceAfterSignIn(), 2000);
      return;
    }

    // Validate invite
    const { data: validateJson, error: validateError } = await supabase.functions.invoke("validate-invite", {
      body: { token: inviteToken },
    });

    if (validateError || !validateJson?.ok) {
      return;
    }

    const invite = validateJson.invite;
    if (!invite) {
      return;
    }

    // validate-invite returns invite.invite_email
    const inviteEmail = invite.invite_email ?? invite.email;

    // Check if user's email matches invite email
    if (inviteEmail && session.user.email !== inviteEmail) {
      toast({
        title: "Invite email mismatch",
        description: "This invite is for a different email address.",
        variant: "destructive",
      });
      return;
    }

    // Accept the invite - supabase.functions.invoke should automatically include auth header
    const { data: acceptJson, error: acceptError } = await supabase.functions.invoke("accept-invite", {
      body: { token: inviteToken, userId: session.user.id },
    });

    if (acceptError) {
      console.error("Invite acceptance error:", acceptError);
      
      // Try to extract detailed error message from error.context (FunctionsHttpError)
      let errorMessage = acceptError.message || "Please try again.";
      
      if ((acceptError as any).context) {
        try {
          const errorContext = (acceptError as any).context;
          let errorData: any;
          
          // error.context might be a Response object or already parsed
          if (typeof errorContext.json === 'function') {
            errorData = await errorContext.json();
          } else if (typeof errorContext === 'object') {
            errorData = errorContext;
          }
          
          if (errorData?.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`;
            }
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.warn("Could not parse error context:", parseError);
        }
      }
      
      toast({
        title: "Failed to accept invite",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    const accepted = acceptJson?.ok || acceptJson?.error === "invite already accepted";
    if (accepted) {
      toast({
        title: "Invite accepted",
        description: "You have been added to the company. Redirecting to dashboard...",
      });

      // Clear invite token from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("invite");
      newParams.delete("project_invite");
      setSearchParams(newParams);

      // Wait a moment for profile to update, then redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } else {
      console.error("Invite acceptance failed:", acceptJson);
      const errorMsg = acceptJson?.error || acceptJson?.details || "Please try again.";
      toast({
        title: "Failed to accept invite",
        description: errorMsg,
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Error accepting invite after sign-in:", error);
  }
};


  // Reset forms and phone error when switching modes
  useEffect(() => {
    if (mode !== "signup") {
      setPhoneError(null);
      setPasswordStrengthError(false);
      signupForm.resetForm();
    }
    if (mode !== "signin") {
      signinForm.resetForm();
    }
    if (mode !== "forgot") {
      resetPasswordForm.resetForm();
    }
  }, [mode]);

  // ---------------- SIGNUP STATE ----------------
  const [countryCode, setCountryCode] = useState("+91"); // default India

  const signupForm = useFormValidation({
    schema: signupSchema,
    initialValues: {
      name: "",
      email: "",
      phone: "",
      countryCode: "+91",
      password: "",
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // ---------------- SIGNIN STATE ----------------
  const signinForm = useFormValidation({
    schema: signinSchema,
    initialValues: {
      email: "",
      password: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // ---------------- FORGOT PASSWORD STATE ----------------
  const resetPasswordForm = useFormValidation({
    schema: resetPasswordSchema,
    initialValues: {
      email: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // ---------------- PASSWORD VALIDATION ----------------
  // Check if all password requirements are met
  const isPasswordValid = () => {
    const pwd = signupForm.values.password;
    return (
      pwd.length >= 8 &&
      /[a-z]/.test(pwd) &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    );
  };

  useEffect(() => {
    // Reset password strength error when all requirements are met
    if (isPasswordValid()) {
      setPasswordStrengthError(false);
    }
  }, [signupForm.values.password]);

  // ---------------- PHONE VALIDATION WITH COUNTRY CODE ----------------
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordStrengthError, setPasswordStrengthError] = useState(false);

  useEffect(() => {
    if (signupForm.values.phone && countryCode) {
      const error = validatePhoneNumber(signupForm.values.phone, countryCode);
      setPhoneError(error);
    } else {
      setPhoneError(null);
    }
  }, [signupForm.values.phone, countryCode]);

  // Update countryCode in form when it changes
  useEffect(() => {
    signupForm.setValue("countryCode", countryCode);
  }, [countryCode]);

  // ---------------- HANDLERS ----------------

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show errors
    signupForm.validateForm();

    // Validate phone with country code
    const currentPhoneError = validatePhoneNumber(signupForm.values.phone, countryCode);
    setPhoneError(currentPhoneError);

    // Check if all password requirements are met
    const passwordIsValid = isPasswordValid();
    setPasswordStrengthError(!passwordIsValid && signupForm.values.password.length > 0);

    // Check if form is valid (including phone and password requirements)
    const hasFormErrors = !signupForm.isValid || !!currentPhoneError || !passwordIsValid;
    const hasAllFields = 
      signupForm.values.name &&
      signupForm.values.email &&
      signupForm.values.phone &&
      signupForm.values.password;

    if (hasFormErrors || !hasAllFields) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before signing up.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const fullPhone = countryCode + signupForm.values.phone;

      const { data, error } = await supabase.auth.signUp({
        email: signupForm.values.email,
        password: signupForm.values.password,
        options: {
          data: {
            name: signupForm.values.name,
            phone: fullPhone,
          },
          emailRedirectTo: `${normalizeUrl(window.location.origin)}/verify-email`,
        },
      });

      console.log("signUp response:", { data, error });

      if (error) {
        throw error;
      }

      if (
        data?.user &&
        Array.isArray((data.user as any).identities) &&
        (data.user as any).identities.length === 0
      ) {
        toast({
          title: "Account already exists",
          description:
            "An account with this email already exists. Please sign in instead.",
          variant: "destructive",
        });
        return;
      }

      // Create or update profile with name and phone
      // Retry logic to ensure profile is saved even if trigger hasn't run yet
      if (data?.user?.id) {
        let profileSaved = false;
        let retries = 0;
        const maxRetries = 3;
        
        while (!profileSaved && retries < maxRetries) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              name: signupForm.values.name.trim(),
              phone: fullPhone.trim(),
              email: signupForm.values.email.trim(),
            }, {
              onConflict: "id",
            });

          if (profileError) {
            console.error(`[Auth] Error upserting profile (attempt ${retries + 1}/${maxRetries}):`, profileError);
            retries++;
            // Wait a bit before retrying (exponential backoff)
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500 * retries));
            }
          } else {
            profileSaved = true;
            console.log("[Auth] Profile upserted successfully");
          }
        }
        
        if (!profileSaved) {
          console.warn("[Auth] Failed to upsert profile after retries - trigger should handle it");
        }
      }

      toast({
        title: "verification email sent",
        description:
          "Please check your email inbox and confirm your email to sign in.",
      });
    } catch (error: any) {
      const rawMessage: string = error?.message || "";
      let friendlyMessage = rawMessage;

      if (friendlyMessage?.includes("User already")) {
        friendlyMessage =
          "An account with this email already exists. Please sign in instead.";
      }

      // Detect Supabase email rate limit for verification emails
      const lower = rawMessage.toLowerCase();
      const isRateLimit =
        error?.status === 429 ||
        error?.code === "over_email_send_rate_limit" ||
        lower.includes("rate limit") ||
        lower.includes("only request this") ||
        lower.includes("security purposes") ||
        lower.includes("after") && lower.includes("seconds");

      let description = friendlyMessage || "Something went wrong";

      if (isRateLimit) {
        // Try to extract wait time from message (e.g., "after 59 seconds")
        const waitMatch = rawMessage.match(/(\d+)\s*seconds?/i);
        const waitSeconds = waitMatch ? parseInt(waitMatch[1], 10) || 60 : 60;

        // Start / update cooldown timer and persist ready-at timestamp
        const readyAt = Date.now() + waitSeconds * 1000;
        try {
          localStorage.setItem("signup-resend-ready-at", String(readyAt));
        } catch {
          // Ignore storage errors
        }
        setResendCooldown(waitSeconds);

        description =
          `You've requested verification too many times. ` +
          `Please wait ${waitSeconds} seconds before trying again. ` +
          `A countdown is shown below the Sign Up button.`;
      }

      toast({
        title: "signup failed",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Skip form validation if invite token is present (user should use magic link)
    if (!inviteToken && !signinForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before signing in.",
        variant: "destructive",
      });
      return;
    }

    // If invite token is present, prevent password sign-in
    if (inviteToken) {
      toast({
        title: "Use magic link to sign in",
        description: "Please check your email and click the magic link to sign in and accept the invite.",
        variant: "default",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signinForm.values.email,
        password: signinForm.values.password,
      });

      console.log("signIn response:", { data, error });

      if (error) {
        // Handle specific error for invited users (account exists but no password)
        if (inviteToken && (error.message?.includes("Invalid login credentials") || 
            error.message?.includes("Email not confirmed") ||
            error.message?.includes("invalid_credentials"))) {
          throw new Error("This account was created via invite. Please use the magic link sent to your email to sign in. Check your email inbox for the sign-in link.");
        }
        throw error;
      }

      if (!data?.user) {
        throw new Error("Login failed. Please check your credentials.");
      }

      // Handle invite acceptance if token is present
      if (inviteToken && data.user) {
        try {
          const { data: acceptJson, error: acceptError } = await supabase.functions.invoke("accept-invite", {
            body: { token: inviteToken, userId: data.user.id },
          });
          if (!acceptError && acceptJson?.ok) {
            toast({
              title: "Invite accepted",
              description: "You have been added to the company.",
            });
          } else {
            // Don't block navigation if invite acceptance fails
            console.error("Invite acceptance failed:", acceptJson?.error);
          }
        } catch (err) {
          // Don't block navigation if invite acceptance fails
          console.error("Error accepting invite:", err);
        }
      }

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Sign in failed",
        description:
          error?.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetPasswordForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const email = resetPasswordForm.values.email.trim();

      // Step 1: Check if email exists in Auth database
      const { data: emailCheckData, error: emailCheckError } = await supabase.functions.invoke(
        "check-email-exists",
        {
          body: { email },
        }
      );

      if (emailCheckError) {
        throw new Error("Failed to verify email. Please try again.");
      }

      // Step 2: If email doesn't exist, show error and stop
      if (!emailCheckData?.exists) {
        // Set inline field error
        resetPasswordForm.setFieldError("email", "This email is not registered");
        resetPasswordForm.setFieldTouched("email", true);
        
        toast({
          title: "Email not found",
          description: "This email is not registered. Please check and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Step 3: Email exists - proceed with password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${normalizeUrl(window.location.origin)}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for the reset link.",
      });

      setMode("signin");
    } catch (error: any) {
      // Handle errors from resetPasswordForEmail or other issues
      const errorMessage = error.message || "Something went wrong";
      
      // Don't show duplicate error if we already showed "email not found"
      if (!errorMessage.includes("not registered")) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------- HEADER TEXT ----------------

  const headerTitle =
    mode === "signup"
      ? "Create an account"
      : mode === "signin"
      ? "Welcome back"
      : "Forgot password?";

  const headerDescription =
    mode === "signup"
      ? "Enter your details to get started."
      : mode === "signin"
      ? "Sign in to your account to continue."
      : "Enter your email to receive a password reset link";

  // ---------------- RENDER ----------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <motion.div
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg space-y-4"
      >
        {isDeactivated && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Account deactivated</AlertTitle>
            <AlertDescription>
              Your account has been deactivated. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}
        <Card className="w-full shadow-lg border border-border/70">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-bold">{headerTitle}</CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* SIGN UP - Hidden when invite token is present */}
          {mode === "signup" && !inviteToken && (
            <form onSubmit={handleSignup} className="space-y-4">
              <FormFieldWrapper
                label="Full Name"
                name="name"
                value={signupForm.values.name}
                onChange={signupForm.handleChange("name")}
                onBlur={signupForm.handleBlur("name")}
                error={signupForm.getFieldError("name")}
                touched={signupForm.isFieldTouched("name")}
                placeholder="Your full name"
                required
              />

              <FormFieldWrapper
                label="Business Email"
                name="email"
                type="email"
                value={signupForm.values.email}
                onChange={signupForm.handleChange("email")}
                onBlur={signupForm.handleBlur("email")}
                error={signupForm.getFieldError("email")}
                touched={signupForm.isFieldTouched("email")}
                placeholder="you@company.com"
                required
              />

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select
                    value={countryCode}
                    onValueChange={(value) => setCountryCode(value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">US +1</SelectItem>
                      <SelectItem value="+44">UK +44</SelectItem>
                      <SelectItem value="+91">IN +91</SelectItem>
                      <SelectItem value="+61">AU +61</SelectItem>
                      <SelectItem value="+49">DE +49</SelectItem>
                      <SelectItem value="+33">FR +33</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={signupForm.values.phone}
                    onChange={(e) => {
                      // Only allow digits (0-9)
                      const filteredValue = e.target.value.replace(/\D/g, "");
                      signupForm.handleChange("phone")({ ...e, target: { ...e.target, value: filteredValue } });
                    }}
                    onBlur={signupForm.handleBlur("phone")}
                    placeholder=""
                    className={signupForm.isFieldTouched("phone") && (signupForm.getFieldError("phone") || phoneError) ? "border-destructive" : ""}
                  />
                </div>
                {signupForm.isFieldTouched("phone") && (signupForm.getFieldError("phone") || phoneError) && (
                  <p className="mt-1 text-xs text-destructive">
                    {signupForm.getFieldError("phone") || phoneError}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={signupForm.values.password}
                  onChange={signupForm.handleChange("password")}
                  onBlur={signupForm.handleBlur("password")}
                  className={(signupForm.isFieldTouched("password") && signupForm.getFieldError("password")) || passwordStrengthError ? "border-destructive" : ""}
                />
                {signupForm.isFieldTouched("password") && signupForm.getFieldError("password") && (
                  <p className="mt-1 text-xs text-destructive">
                    {signupForm.getFieldError("password")}
                  </p>
                )}
                {passwordStrengthError && (
                  <p className="mt-1 text-xs text-destructive">
                    Password must meet all requirements to sign up.
                  </p>
                )}
                <PasswordChecklist password={signupForm.values.password} />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || resendCooldown > 0}
              >
                {loading
                  ? "Signing up..."
                  : resendCooldown > 0
                  ? `Sign Up (available in ${resendCooldown}s)`
                  : "Sign Up"}
              </Button>

              {resendCooldown > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  You can request another verification email in{" "}
                  <span className="font-semibold">{resendCooldown}s</span>.
                </p>
              )}

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* SIGN IN */}
          {mode === "signin" && (
            <form onSubmit={handleSignin} className="space-y-5">
              {/* Show invite message when invite token is present */}
              {inviteToken && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-sm font-medium text-primary mb-1">
                    You&apos;ve been invited to join a company
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A magic link has been sent to your email. Click the link in your email to sign in and accept the invite. 
                    {signinForm.values.email && (
                      <> If you haven&apos;t received it, check your inbox for <strong>{signinForm.values.email}</strong>.</>
                    )}
                  </p>
                </div>
              )}

              <FormFieldWrapper
                label="Business Email"
                name="email"
                type="email"
                value={signinForm.values.email}
                onChange={signinForm.handleChange("email")}
                onBlur={signinForm.handleBlur("email")}
                error={signinForm.getFieldError("email")}
                touched={signinForm.isFieldTouched("email")}
                placeholder="you@company.com"
                required
                disabled={!!inviteToken} // Disable email input when invite token is present
              />

              <FormFieldWrapper
                label="Password"
                name="password"
                type="password"
                value={signinForm.values.password}
                onChange={signinForm.handleChange("password")}
                onBlur={signinForm.handleBlur("password")}
                error={inviteToken ? undefined : signinForm.getFieldError("password")} // Hide error when invite token is present
                touched={inviteToken ? false : signinForm.isFieldTouched("password")} // Don't show as touched when invite token is present
                placeholder={inviteToken ? "Use magic link from email instead" : "Enter your password"}
                required={!inviteToken} // Not required when invite token is present
                disabled={!!inviteToken} // Disable password input when invite token is present
              />

              {!inviteToken && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button className="w-full" type="submit" disabled={loading || !!inviteToken}>
                {loading ? "Signing in..." : inviteToken ? "Use magic link from email" : "Sign In"}
              </Button>

              {!inviteToken && (
                <p className="text-sm text-center text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </form>
          )}

          {/* FORGOT PASSWORD - Hidden when invite token is present */}
          {mode === "forgot" && !inviteToken && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <FormFieldWrapper
                label="Business Email"
                name="email"
                type="email"
                value={resetPasswordForm.values.email}
                onChange={resetPasswordForm.handleChange("email")}
                onBlur={resetPasswordForm.handleBlur("email")}
                error={resetPasswordForm.getFieldError("email")}
                touched={resetPasswordForm.isFieldTouched("email")}
                placeholder="you@company.com"
                required
              />

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline"
                >
                  ← Back to Sign In
                </button>
              </p>
            </form>
          )}
        </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
