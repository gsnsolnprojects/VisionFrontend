// supabase/functions/create-invite/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL")!; // e.g. http://localhost:8080 or your deployed app

// Normalize APP_URL to remove trailing slashes
const normalizedAppUrl = APP_URL.replace(/\/+$/, '');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  companyId: string;
  inviteEmail: string;
  inviteName?: string;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    const body: Body = await req.json().catch(() => ({} as Body));
    const { companyId, inviteEmail, inviteName } = body ?? {};

    if (!companyId || !inviteEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "companyId and inviteEmail are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // ---- Auth: get inviter from access token ----
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization bearer token required",
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("auth.getUser error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid auth token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    const inviterId = user.id;

    // ---- Company lookup ----
    const { data: company, error: compErr } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (compErr) {
      console.error("company lookup error:", compErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to load company: ${
            compErr.message ?? String(compErr)
          }`,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    if (!company) {
      return new Response(
        JSON.stringify({ success: false, error: "Company not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // ---- Permission check: Verify inviter is admin of the SPECIFIC company (companyId) ----
    // Admin is determined ONLY by: inviter created the company (created_by === inviterId)
    // Email match check has been removed - only company creator can invite users
    
    let isAdmin = false;

    // Check: User created the company (check created_by field)
    if (company.created_by && company.created_by === inviterId) {
      isAdmin = true;
    }

    // If inviter did not create the company, reject and don't send email
    if (!isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Insufficient permissions: must be company admin",
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // ---- Rate limit: at most 2 invites to the same user per 5 minutes (per company) ----
    try {
      const windowMs = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();

      const { data: recentInvites, error: rateError } = await supabase
        .from("company_invites")
        .select("created_at")
        .eq("company_id", companyId)
        .eq("email", inviteEmail)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!rateError && recentInvites && recentInvites.length > 0) {
        const withinWindow = recentInvites.filter((row) => {
          const createdAt = new Date(row.created_at as string).getTime();
          return now - createdAt < windowMs;
        });

        // Allow at most 2 invites in the window; block if 2 or more already exist
        if (withinWindow.length >= 2) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Too many invites to this user recently. Please wait 5 minutes before inviting again.",
              errorCode: "INVITE_RATE_LIMIT",
              waitTimeSeconds: 5 * 60,
            }),
            { status: 429, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      }
    } catch (rateCheckError) {
      console.error("create-invite rate limit check error:", rateCheckError);
      // On error, do not block the invite to avoid breaking legitimate flows
    }

    // ---- Check if invitee email already exists in this company ----
    const { data: existingMember } = await supabase
      .from("profiles")
      .select("id, email, company_id")
      .eq("email", inviteEmail)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User already a member",
          errorCode: "USER_ALREADY_MEMBER",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // ---- Check if invitee email already belongs to a different company ----
    const { data: existingInAnotherCompany } = await supabase
      .from("profiles")
      .select("id, email, company_id")
      .eq("email", inviteEmail)
      .neq("company_id", companyId)
      .not("company_id", "is", null)
      .maybeSingle();

    if (existingInAnotherCompany) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User already exists in another company and cannot be added to your company",
          errorCode: "USER_IN_ANOTHER_COMPANY",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // ---- Create invite row in company_invites ----
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: inserted, error: insertErr } = await supabase
      .from("company_invites")
      .insert([
        {
          company_id: companyId,
          email: inviteEmail,
          token,
          created_by: inviterId,
          expires_at: expiresAt,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (insertErr) {
      console.error("insert invite error:", insertErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create invite" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    // Frontend invite link (same one you copy in the UI)
    const inviteLink = `${normalizedAppUrl}/auth?invite=${encodeURIComponent(token)}`;

    // ---- Determine whether the invitee already has an Auth account ----
    // We use this only to decide whether to require the "set password" flow.
    let existingUser: any = null;
    try {
      const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
      if (!userError && usersData?.users) {
        existingUser = usersData.users.find((u: any) => u.email === inviteEmail) || null;
      }
    } catch (err) {
      console.log("create-invite: auth.admin.listUsers error (will treat as new user):", err);
    }

    // Build user_metadata for the invite:
    // - New users: mark needs_password_set = true so the frontend routes them to /set-password
    // - Existing users: do NOT set needs_password_set so they go directly into the company
    const baseMetadata: Record<string, unknown> = {
      company_id: companyId,
      company_name: company.name ?? null,
      invite_token: token,
    };

    const userMetadata: Record<string, unknown> = existingUser
      ? baseMetadata
      : { ...baseMetadata, needs_password_set: true };

    // ---- Send invite email via Supabase Auth using the built-in "Invite user" template ----
    // This will work for both new and existing users and will send the invite email
    // using Supabase's configured "Invite user" email template.
    console.log("Sending invite email via supabase.auth.admin.inviteUserByEmail to:", inviteEmail, {
      isExistingUser: !!existingUser,
    });

    const { data: inviteUserData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      inviteEmail,
      {
        redirectTo: inviteLink,
        data: userMetadata,
      },
    );

    if (inviteError) {
      console.error("inviteUserByEmail error:", inviteError);
      await supabase
        .from("company_invites")
        .update({
          status: "email_failed",
          error_message: inviteError.message ?? String(inviteError),
        })
        .eq("id", inserted.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send invite email",
          details: inviteError.message ?? String(inviteError),
          inviteLink,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }

    const authUserId = inviteUserData?.user?.id ?? null;

    // Mark email sent + store auth user id (if available)
    await supabase
      .from("company_invites")
      .update({
        status: "email_sent",
        auth_user_id: authUserId,
      })
      .eq("id", inserted.id);

    return new Response(
      JSON.stringify({
        success: true,
        inviteId: inserted.id,
        inviteLink,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
    );
  } catch (err: any) {
    console.error("Unhandled create-invite error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message ?? String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }
});