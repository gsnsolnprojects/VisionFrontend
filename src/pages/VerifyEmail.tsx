import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { supabase } from "@/integrations/supabase/client";
import { ResendVerification } from "@/components/auth/ResendVerification";

type VerificationStatus = "loading" | "verified" | "already_verified" | "invalid";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState<string>("");

  // Force light theme on verify email page (no dark mode)
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

  // Check verification status on mount
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        // Wait a moment for Supabase to process the redirect/hash fragments
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          // No session: the link was already used (opened twice / in another browser) or is too old.
          // Supabase puts the reason in the URL, e.g. #error_code=otp_expired
          const reason = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_code") ||
            new URLSearchParams(window.location.search).get("error_code");
          setStatus("invalid");
          setMessage(
            reason === "otp_expired"
              ? "This verification link was already used or has expired. Each link works only once."
              : "We couldn't verify your email with this link. It may have been used already or expired."
          );
          return;
        }

        const user = session.user;
        const emailConfirmedAt = user.email_confirmed_at;

        if (!emailConfirmedAt) {
          // User exists but email not confirmed - shouldn't happen after clicking verification link
          setStatus("invalid");
          setMessage("Email verification failed. Please try signing up again.");
          return;
        }

        // Check if this is a recent verification (within last 10 seconds)
        const confirmedTimestamp = new Date(emailConfirmedAt).getTime();
        const now = Date.now();
        const timeSinceConfirmation = now - confirmedTimestamp;
        const isRecentVerification = timeSinceConfirmation < 10000; // 10 seconds

        if (isRecentVerification) {
          // First-time verification - update profile
          try {
            await supabase
              .from("profiles")
              .update({ is_verified: true })
              .eq("id", user.id);
          } catch (profileError) {
            console.error("Error updating profile verification status:", profileError);
            // Don't fail verification if profile update fails
          }

          setStatus("verified");
          setMessage("Your email has been successfully verified.");
        } else {
          // Already verified (clicking link again)
          setStatus("already_verified");
          setMessage("Your email has already been verified. You can sign in now.");
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
        setStatus("invalid");
        setMessage("An error occurred while verifying your email. Please try again.");
      }
    };

    checkVerificationStatus();
  }, []);

  // Auto-redirect for verified status only (first-time verification)
  useEffect(() => {
    if (status === "verified") {
      const timer = setTimeout(() => {
        navigate("/auth?mode=signin");
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const goNow = () => {
    navigate("/auth?mode=signin");
  };

  const goToSignUp = () => {
    navigate("/auth?mode=signup");
  };

  // Render loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <Card className="w-full text-center shadow-lg border border-border/70">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Render verified state (first-time verification)
  if (status === "verified") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <Card className="w-full text-center shadow-lg border border-border/70">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl text-green-600">✓</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Email verified</CardTitle>
              <CardDescription>
                {message}
                <br />
                Redirecting you to the sign in page…
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={goNow}>
                Go to Sign In now
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Render already verified state
  if (status === "already_verified") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <Card className="w-full text-center shadow-lg border border-border/70">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-3xl text-blue-600">✓</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Account already verified</CardTitle>
              <CardDescription>
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={goNow}>
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Render invalid/error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <motion.div
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="w-full text-center shadow-lg border border-border/70">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-3xl text-red-600">✕</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Verification link invalid or expired</CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-left">
              <p className="font-medium text-foreground">Already verified?</p>
              <p className="text-muted-foreground">
                If you clicked the link before, your email is probably verified already. Just sign in.
              </p>
            </div>
            <Button className="w-full" onClick={goNow}>
              Go to Sign In
            </Button>
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm text-left text-muted-foreground">Need a new link? We'll email it to you.</p>
              <ResendVerification />
            </div>
            <Button className="w-full" variant="ghost" onClick={goToSignUp}>
              Go to Sign Up
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;