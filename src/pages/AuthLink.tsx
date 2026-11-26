import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/authClient";

/**
 * Landing page of the emailed one-time sign-in link (/auth/link?token=...), used for
 * organisation invites. Signs the person in, then continues where the link points
 * (usually /auth?invite=... so the invite is accepted).
 */
const AuthLink = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // the link works once: never send it twice
    started.current = true;
    const token = new URLSearchParams(window.location.search).get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setError("This sign-in link is incomplete. Please request a new one.");
      return;
    }
    auth.magicLogin(token).then(({ error: loginError, redirectTo }) => {
      if (loginError) {
        setError(loginError.message);
        return;
      }
      navigate(redirectTo.startsWith("/") ? redirectTo : "/dashboard", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">{error ? "Sign-in link didn't work" : "Signing you in…"}</CardTitle>
          {error && <CardDescription>{error}</CardDescription>}
        </CardHeader>
        {error && (
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth?mode=signin")}>
              Go to Sign In
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AuthLink;
