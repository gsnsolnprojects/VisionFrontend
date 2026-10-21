import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Continue with Google" for the sign-in and sign-up pages. Google sends the person back to
 * /dashboard signed in; first-time users then complete their profile and create or join a
 * company like any new sign-up. Needs the Google provider switched on in Supabase Auth.
 */
export const GoogleSignInButton: React.FC<{ onError: (message: string) => void }> = ({ onError }) => {
  const [redirecting, setRedirecting] = useState(false);

  const signIn = async () => {
    setRedirecting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin.replace(/\/+$/, "")}/dashboard`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setRedirecting(false);
      onError(
        /provider is not enabled|unsupported provider/i.test(error.message)
          ? "Google sign-in isn't available yet. Please use your email and password."
          : error.message || "Could not start Google sign-in. Please try again."
      );
    }
    // On success the browser leaves for Google, so there is nothing more to do here
  };

  return (
    <Button type="button" variant="outline" className="w-full gap-3" onClick={signIn} disabled={redirecting}>
      {redirecting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
      )}
      Continue with Google
    </Button>
  );
};
