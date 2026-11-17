import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { getSignupPlan, rememberSignupPlan, verifyEmailUrl } from "@/lib/signupPlan";
import { AuthInspectionPanel } from "@/components/auth/AuthInspectionPanel";
import { SignupJourneyPanel } from "@/components/auth/SignupJourneyPanel";
import { CheckEmail, IconField, PasswordRules, SignupSteps, fieldMotion, inputClass } from "@/components/auth/SignupFormParts";
import { ArrowRight, Loader2, Lock, Mail, Phone, Sparkles, User } from "lucide-react";
import { ResendVerification } from "@/components/auth/ResendVerification";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { error: profileError, user: signedInUser, sessionReady } = useProfile();
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
  // Email of a sign-in attempt refused because it isn't verified yet (shows the resend box)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  // Email a sign-up was just sent to: shows "Check your inbox" in place of the form
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  
  // Plan picked on the landing page (?plan=playground), highlighted later on the Billing page
  useEffect(() => {
    rememberSignupPlan(searchParams.get("plan"));
  }, [searchParams]);

  // Get invite token from URL if present
  const inviteToken = searchParams.get("invite") ?? searchParams.get("project_invite");

  // Already signed in (e.g. reopened the sign-in link): go to the app instead of showing the form.
  // Invite links stay here, they finish accepting the invite on this page.
  useEffect(() => {
    if (sessionReady && signedInUser && !inviteToken) {
      navigate("/dashboard", { replace: true });
    }
  }, [sessionReady, signedInUser, inviteToken, navigate]);
  
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
          description: "You have been added to the organisation. Redirecting to dashboard...",
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
        description: "You have been added to the organisation. Redirecting to dashboard...",
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

  // ---------------- SIGNUP FORM VALIDATION FOR BUTTON STATE ----------------
  // Check if all required fields are filled and valid
  const isSignupFormValid = () => {
    // Check if all required fields have values
    const hasAllFields = 
      signupForm.values.name?.trim() &&
      signupForm.values.email?.trim() &&
      signupForm.values.phone?.trim() &&
      signupForm.values.password?.trim();

    if (!hasAllFields) {
      return false;
    }

    // Check if form validation passes
    if (!signupForm.isValid) {
      return false;
    }

    // Check if phone validation passes (validate synchronously for immediate feedback)
    if (signupForm.values.phone && countryCode) {
      const currentPhoneError = validatePhoneNumber(signupForm.values.phone, countryCode);
      if (currentPhoneError) {
        return false;
      }
    }

    // Check if password validation passes
    if (!isPasswordValid()) {
      return false;
    }

    return true;
  };

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
          emailRedirectTo: verifyEmailUrl(),
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

      // "Check your inbox" replaces the form
      setSentTo(signupForm.values.email.trim());
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
    setUnverifiedEmail(null);

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
              description: "You have been added to the organisation.",
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
      if (!inviteToken && /email not confirmed/i.test(error?.message || "")) {
        setUnverifiedEmail(signinForm.values.email);
      }
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

  const showSignup = mode === "signup" && !inviteToken;
  const forPlayground = getSignupPlan() === "playground";
  const signupReady = isSignupFormValid() && !loading && resendCooldown <= 0;
  const touchedError = (field: "name" | "email") =>
    signupForm.isFieldTouched(field) ? signupForm.getFieldError(field) : null;
  const phoneShownError =
    signupForm.isFieldTouched("phone") ? signupForm.getFieldError("phone") || phoneError : null;

  return (
    <div
      className={`min-h-screen flex flex-col lg:grid lg:grid-cols-2 ${
        showSignup ? "bg-[#f4f4ec]" : "bg-gradient-to-br from-background via-background to-primary/5"
      }`}
    >
      {showSignup ? <SignupJourneyPanel /> : <AuthInspectionPanel />}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Sign-up: soft glows drifting behind the card */}
      {showSignup && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#e9ff65]/50 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-[#9ab51f]/25 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
      <motion.div
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-lg space-y-4"
      >
        {isDeactivated && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Account deactivated</AlertTitle>
            <AlertDescription>
              Your account has been deactivated. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* SIGN UP - the client sign-up link (/start) lands here */}
        {showSignup ? (
          <div className="rounded-3xl border border-[#e4e7dc] bg-white/90 p-6 shadow-[0_24px_70px_-30px_rgba(23,31,27,0.45)] backdrop-blur sm:p-9">
            <div className="mb-7">
              <SignupSteps current={sentTo ? 1 : 0} />
            </div>

            {sentTo ? (
              <CheckEmail
                email={sentTo}
                onBack={() => setSentTo(null)}
                onSignIn={() => {
                  setSentTo(null);
                  setMode("signin");
                }}
              />
            ) : (
              <div className="space-y-5">
                <motion.div custom={0} variants={fieldMotion} initial="hidden" animate="visible">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171f1b] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#e9ff65]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {forPlayground ? "Playground edition" : "Vision-M Studio"}
                  </span>
                  <h1 className="mt-4 text-[32px] font-bold leading-tight tracking-tight text-[#171f1b]">
                    {forPlayground ? "Start your Playground" : "Create your account"}
                  </h1>
                  <p className="mt-1.5 text-[15px] text-[#5d675e]">
                    {forPlayground
                      ? "It takes under a minute. You'll choose your plan right after."
                      : "It takes under a minute to get started."}
                  </p>
                </motion.div>

                <motion.div custom={1} variants={fieldMotion} initial="hidden" animate="visible" className="space-y-5">
                  <GoogleSignInButton
                    className="h-12 rounded-xl border-[#dfe3d6] bg-white text-[15px] font-semibold text-[#171f1b] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#171f1b]/30 hover:bg-white hover:shadow-md"
                    onError={(message) => toast({ title: "Google sign-in failed", description: message, variant: "destructive" })}
                  />
                  <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-widest text-[#9aa396]">
                    <span className="h-px flex-1 bg-[#e4e7dc]" />
                    or with your email
                    <span className="h-px flex-1 bg-[#e4e7dc]" />
                  </div>
                </motion.div>

                <form onSubmit={handleSignup} className="space-y-4" noValidate>
                  <IconField id="name" label="Full name" icon={User} index={2} error={touchedError("name")}>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={signupForm.values.name}
                      onChange={signupForm.handleChange("name")}
                      onBlur={signupForm.handleBlur("name")}
                      placeholder="Your full name"
                      className={inputClass(!!touchedError("name"))}
                    />
                  </IconField>

                  <IconField id="email" label="Work email" icon={Mail} index={3} error={touchedError("email")}>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={signupForm.values.email}
                      onChange={signupForm.handleChange("email")}
                      onBlur={signupForm.handleBlur("email")}
                      placeholder="you@company.com"
                      className={inputClass(!!touchedError("email"))}
                    />
                  </IconField>

                  <motion.div custom={4} variants={fieldMotion} initial="hidden" animate="visible" className="space-y-1.5">
                    <Label htmlFor="phone" className="text-[13px] font-semibold text-[#2b3530]">
                      Phone number
                    </Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={(value) => setCountryCode(value)}>
                        <SelectTrigger
                          className="h-12 w-[104px] shrink-0 rounded-xl border-[#dfe3d6] bg-[#fbfbf7] text-[15px] focus:ring-4 focus:ring-[#e9ff65]/40 focus:ring-offset-0"
                          aria-label="Country code"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+91">IN +91</SelectItem>
                          <SelectItem value="+1">US +1</SelectItem>
                          <SelectItem value="+44">UK +44</SelectItem>
                          <SelectItem value="+61">AU +61</SelectItem>
                          <SelectItem value="+49">DE +49</SelectItem>
                          <SelectItem value="+33">FR +33</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="group relative flex-1">
                        <Phone
                          className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8a968c] transition-colors group-focus-within:text-[#171f1b]"
                          aria-hidden="true"
                        />
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={signupForm.values.phone}
                          onChange={(e) => {
                            // Only allow digits (0-9)
                            const filteredValue = e.target.value.replace(/\D/g, "");
                            signupForm.handleChange("phone")({ ...e, target: { ...e.target, value: filteredValue } });
                          }}
                          onBlur={signupForm.handleBlur("phone")}
                          placeholder="98765 43210"
                          className={inputClass(!!phoneShownError)}
                        />
                      </div>
                    </div>
                    {phoneShownError && <p className="text-xs text-destructive">{phoneShownError}</p>}
                  </motion.div>

                  <IconField
                    id="password"
                    label="Password"
                    icon={Lock}
                    index={5}
                    error={
                      (signupForm.isFieldTouched("password") && signupForm.getFieldError("password")) ||
                      (passwordStrengthError ? "Password must meet all the requirements below." : null)
                    }
                  >
                    <PasswordInput
                      id="password"
                      autoComplete="new-password"
                      value={signupForm.values.password}
                      onChange={signupForm.handleChange("password")}
                      onBlur={signupForm.handleBlur("password")}
                      placeholder="Create a strong password"
                      className={inputClass(passwordStrengthError)}
                    />
                  </IconField>
                  <motion.div custom={6} variants={fieldMotion} initial="hidden" animate="visible">
                    <PasswordRules password={signupForm.values.password} />
                  </motion.div>

                  <motion.div custom={7} variants={fieldMotion} initial="hidden" animate="visible" className="space-y-3 pt-2">
                    <motion.button
                      type="submit"
                      disabled={!signupReady}
                      whileHover={signupReady ? { y: -2 } : undefined}
                      whileTap={signupReady ? { scale: 0.98 } : undefined}
                      className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#171f1b] text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(23,31,27,0.8)] transition-colors disabled:cursor-not-allowed disabled:bg-[#c6ccbf] disabled:shadow-none"
                    >
                      {/* A light sweep across the button once everything is filled in */}
                      {signupReady && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#e9ff65]/25 to-transparent"
                          initial={{ left: "-40%" }}
                          animate={{ left: "120%" }}
                          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                        />
                      )}
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Creating your account...
                        </>
                      ) : resendCooldown > 0 ? (
                        `Try again in ${resendCooldown}s`
                      ) : (
                        <>
                          Create my account
                          <ArrowRight className="h-4 w-4 text-[#e9ff65] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </>
                      )}
                    </motion.button>
                    <p className="text-center text-xs text-[#8a968c]">
                      By creating an account you agree to our{" "}
                      <Link to="/terms" className="font-medium text-[#3d4a40] underline-offset-2 hover:underline">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="font-medium text-[#3d4a40] underline-offset-2 hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </motion.div>
                </form>

                <p className="border-t border-[#eceee6] pt-5 text-center text-sm text-[#5d675e]">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="font-semibold text-[#171f1b] underline-offset-4 hover:underline">
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        ) : (
        <Card className="w-full shadow-lg border border-border/70">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-bold">{headerTitle}</CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Continue with Google - sign in (invites use their magic link instead) */}
          {mode === "signin" && !inviteToken && (
            <div className="space-y-4">
              <GoogleSignInButton
                onError={(message) => toast({ title: "Google sign-in failed", description: message, variant: "destructive" })}
              />
              <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or continue with email
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          {/* SIGN IN */}
          {mode === "signin" && (
            <form onSubmit={handleSignin} className="space-y-5">
              {/* Show invite message when invite token is present */}
              {inviteToken && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-sm font-medium text-primary mb-1">
                    You&apos;ve been invited to join an organisation
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
                label="Email"
                name="email"
                type="email"
                value={signinForm.values.email}
                onChange={signinForm.handleChange("email")}
                onBlur={signinForm.handleBlur("email")}
                error={signinForm.getFieldError("email")}
                touched={signinForm.isFieldTouched("email")}
                placeholder="you@example.com"
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

              {unverifiedEmail && (
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <p className="text-sm font-medium">Your email isn&apos;t verified yet</p>
                  <p className="text-sm text-muted-foreground">
                    Click the link we emailed you, or get a new one here.
                  </p>
                  <ResendVerification initialEmail={unverifiedEmail} />
                </div>
              )}

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
                label="Email"
                name="email"
                type="email"
                value={resetPasswordForm.values.email}
                onChange={resetPasswordForm.handleChange("email")}
                onBlur={resetPasswordForm.handleBlur("email")}
                error={resetPasswordForm.getFieldError("email")}
                touched={resetPasswordForm.isFieldTouched("email")}
                placeholder="you@example.com"
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
        )}
      </motion.div>
      </div>
    </div>
  );
};

export default Auth;
