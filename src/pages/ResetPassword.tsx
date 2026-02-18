import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFieldWrapper } from "@/components/FormFieldWrapper";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { useFormValidation } from "@/hooks/useFormValidation";
import { resetPasswordFormSchema } from "@/lib/validations/authSchemas";
import { fadeInUpVariants } from "@/utils/animations";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [passwordStrengthError, setPasswordStrengthError] = useState(false);

  // Force light theme on reset password page (no dark mode)
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

  const resetPasswordForm = useFormValidation({
    schema: resetPasswordFormSchema,
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // Check if all password requirements are met
  const isPasswordValid = () => {
    const pwd = resetPasswordForm.values.password;
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
  }, [resetPasswordForm.values.password]);

  useEffect(() => {
    checkSession();
  }, []);

  // Ensure user reached this page using Supabase reset link
  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      toast({
        title: "Invalid or expired link",
        description: "Please request a new password reset email.",
        variant: "destructive",
      });
      navigate("/auth?mode=forgot");
      return;
    }

    setSessionChecked(true);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show errors
    resetPasswordForm.validateForm();

    // Check if all password requirements are met
    const passwordIsValid = isPasswordValid();
    setPasswordStrengthError(!passwordIsValid && resetPasswordForm.values.password.length > 0);

    // Check if form is valid (including password requirements)
    const hasFormErrors = !resetPasswordForm.isValid || !passwordIsValid;

    if (hasFormErrors) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before updating password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: resetPasswordForm.values.password,
    });

    if (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated successfully",
        description: "You can now sign in using your new password.",
      });
      // End the temporary password-recovery session so we don't keep a stale/invalid refresh token around.
      // This ensures the user returns to a clean sign-in state after updating their password.
      await supabase.auth.signOut();
      navigate("/auth?mode=signin");
    }

    setLoading(false);
  };

  // Show nothing until session is checked
  if (!sessionChecked) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center text-xl">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                value={resetPasswordForm.values.password}
                onChange={resetPasswordForm.handleChange("password")}
                onBlur={resetPasswordForm.handleBlur("password")}
                className={(resetPasswordForm.isFieldTouched("password") && resetPasswordForm.getFieldError("password")) || passwordStrengthError ? "border-destructive" : ""}
              />
              {resetPasswordForm.isFieldTouched("password") && resetPasswordForm.getFieldError("password") && (
                <p className="mt-1 text-xs text-destructive">
                  {resetPasswordForm.getFieldError("password")}
                </p>
              )}
              {passwordStrengthError && (
                <p className="mt-1 text-xs text-destructive">
                  Password must meet all requirements to update.
                </p>
              )}
              <PasswordChecklist password={resetPasswordForm.values.password} />
            </div>

            <FormFieldWrapper
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={resetPasswordForm.values.confirmPassword}
              onChange={resetPasswordForm.handleChange("confirmPassword")}
              onBlur={resetPasswordForm.handleBlur("confirmPassword")}
              error={resetPasswordForm.getFieldError("confirmPassword")}
              touched={resetPasswordForm.isFieldTouched("confirmPassword")}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
