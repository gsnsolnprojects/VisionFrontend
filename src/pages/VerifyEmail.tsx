import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { auth } from "@/lib/auth/authClient";
import { ResendVerification } from "@/components/auth/ResendVerification";
import { rememberSignupPlan } from "@/lib/signupPlan";

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

  // The plan picked at sign-up comes back in the email link, so it also works on another device
  useEffect(() => {
    rememberSignupPlan(new URLSearchParams(window.location.search).get("plan"));
  }, []);

  // Confirm the email with the token from the link (each link works once); this also signs them in
  useEffect(() => {
    const checkVerificationStatus = async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        setStatus("invalid");
        setMessage("We couldn't verify your email with this link. It may have been used already or expired.");
        return;
      }
      try {
        const { error } = await auth.verifyEmail(token);
        // Remove the token from the address bar so it isn't kept in the browser history
        window.history.replaceState(null, "", window.location.pathname);
        if (error) {
          setStatus("invalid");
          setMessage(
            error.code === "otp_expired"
              ? "This verification link was already used or has expired. Each link works only once."
              : error.message || "We couldn't verify your email with this link. It may have been used already or expired."
          );
          return;
        }
        setStatus("verified");
        setMessage("Your email has been successfully verified.");
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
        navigate("/dashboard");
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
                Taking you to Vision-M Studio…
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Continue now
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