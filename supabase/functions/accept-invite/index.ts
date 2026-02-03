// supabase/functions/accept-invite/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    const userId = body?.userId;

    if (!token || !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "token and userId required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    const { data: invite, error: inviteErr } = await supabase
      .from("company_invites")
      .select("id, company_id, email, token, status, expires_at")
      .eq("token", token)
      .limit(1)
      .maybeSingle();

    if (inviteErr) throw inviteErr;
    if (!invite) {
      return new Response(
        JSON.stringify({ ok: false, error: "invite not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }
    if (invite.status === "accepted") {
      // Treat repeated uses of the same invite token as a soft success.
      // Frontend will handle "invite already accepted" as an accepted state.
      return new Response(
        JSON.stringify({ ok: false, error: "invite already accepted" }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }
    if (invite.status === "revoked") {
      return new Response(
        JSON.stringify({ ok: false, error: "invite revoked" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ ok: false, error: "invite expired" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // Get user's email to verify it matches invite email
    const { data: userProfile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (profileFetchError) {
      console.error("Error fetching profile:", profileFetchError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to fetch user profile",
          details: profileFetchError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    if (!userProfile) {
      console.error("User profile not found for userId:", userId);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "User profile not found. Please try signing out and signing in again.",
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // Verify email matches invite email
    if (userProfile.email !== invite.email) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Email does not match invite",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // Set company_id and role='viewer' on user's profile
    // Users who accept invites are viewers, not admins
    const { error: profileUpdateErr } = await supabase
      .from("profiles")
      .update({
        company_id: invite.company_id,
        role: 'viewer',
      })
      .eq("id", userId);

    if (profileUpdateErr) {
      console.error("profile update error:", profileUpdateErr);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "failed to update profile with company",
          details: profileUpdateErr.message || String(profileUpdateErr),
          code: profileUpdateErr.code,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    const { error: inviteUpdateErr } = await supabase
      .from("company_invites")
      .update({
        status: "accepted",
      })
      .eq("id", invite.id);

    if (inviteUpdateErr) {
      console.error("invite status update error:", inviteUpdateErr);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "failed to update invite status",
          details: inviteUpdateErr.message || String(inviteUpdateErr),
          code: inviteUpdateErr.code,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
    );
  } catch (err: any) {
    console.error("accept-invite error:", err);
    const errorMessage = err?.message ?? String(err);
    const errorDetails = err?.details || err?.hint || null;
    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
        details: errorDetails,
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }
});
