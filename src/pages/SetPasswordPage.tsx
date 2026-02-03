import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

const SetPasswordPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [passwordStrengthError, setPasswordStrengthError] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      const stored = localStorage.getItem("visionm-theme");
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  const form = useFormValidation({
    schema: resetPasswordFormSchema,
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  const isPasswordValid = () => {
    const pwd = form.values.password;
    return (
      pwd.length >= 8 &&
      /[a-z]/.test(pwd) &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    );
  };

  useEffect(() => {
    if (isPasswordValid()) {
      setPasswordStrengthError(false);
    }
  }, [form.values.password]);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/auth", { replace: true });
        return;
      }
      const needsPasswordSet = (data.session.user?.user_metadata as Record<string, unknown>)?.needs_password_set === true;
      if (!needsPasswordSet) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setReady(true);
    };
    void check();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    form.validateForm();
    const passwordIsValid = isPasswordValid();
    setPasswordStrengthError(!passwordIsValid && form.values.password.length > 0);

    if (!form.isValid || !passwordIsValid) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors and meet password requirements.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: form.values.password,
        data: { needs_password_set: false },
      });

      if (error) throw error;

      // Refresh session so ProfileProvider gets updated user_metadata before we navigate
      await supabase.auth.refreshSession();

      toast({
        title: "Password set",
        description: "You can now sign in with your email and password.",
      });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      toast({
        title: "Failed to set password",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
            <CardTitle className="text-center text-xl">Set your password</CardTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Set a password so you can sign in with your email and password next time.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  value={form.values.password}
                  onChange={form.handleChange("password")}
                  onBlur={form.handleBlur("password")}
                  className={(form.isFieldTouched("password") && form.getFieldError("password")) || passwordStrengthError ? "border-destructive" : ""}
                />
                {(form.isFieldTouched("password") && form.getFieldError("password")) && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.getFieldError("password")}
                  </p>
                )}
                {passwordStrengthError && (
                  <p className="mt-1 text-xs text-destructive">
                    Password must meet all requirements.
                  </p>
                )}
                <PasswordChecklist password={form.values.password} />
              </div>

              <FormFieldWrapper
                label="Confirm password"
                name="confirmPassword"
                type="password"
                value={form.values.confirmPassword}
                onChange={form.handleChange("confirmPassword")}
                onBlur={form.handleBlur("confirmPassword")}
                error={form.getFieldError("confirmPassword")}
                touched={form.isFieldTouched("confirmPassword")}
                required
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Setting password..." : "Set password and continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SetPasswordPage;
