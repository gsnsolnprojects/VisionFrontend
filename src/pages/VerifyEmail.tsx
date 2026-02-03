import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { supabase } from "@/integrations/supabase/client";

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
          // No session - might be invalid link or expired
          setStatus("invalid");
          setMessage("This verification link is invalid or has expired. Please sign up again or request a new verification email.");
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
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={goToSignUp}>
              Go to Sign Up
            </Button>
            <Button className="w-full" variant="outline" onClick={goNow}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;