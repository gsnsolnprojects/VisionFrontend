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

    // ---- Check if user exists in Supabase Auth ----
    let existingUser = null;
    try {
      // Use listUsers and filter by email (getUserByEmail might not be available in all versions)
      const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
      if (!userError && usersData?.users) {
        existingUser = usersData.users.find((u: any) => u.email === inviteEmail) || null;
      }
    } catch (err) {
      // User doesn't exist or error checking - will create new user
      console.log("User check error:", err);
    }

    let authUserId: string | null = null;

    // ---- Path A: User doesn't exist - Create account first, then send magic link ----
    if (!existingUser) {
      // Step 1: Create user account
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: inviteEmail,
        email_confirm: false, // User will confirm via magic link
        user_metadata: {
          company_id: companyId,
          company_name: company.name ?? null,
          invite_token: token,
          needs_password_set: true, // Frontend will show Set Password step after first sign-in
        },
      });

      if (createError) {
        console.error("admin.createUser error:", createError);
        await supabase
          .from("company_invites")
          .update({
            status: "email_failed",
            error_message: createError.message ?? String(createError),
          })
          .eq("id", inserted.id);

        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create user account",
            details: createError.message ?? String(createError),
            inviteLink,
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
        );
      }

      authUserId = newUser?.user?.id ?? null;

      // Step 2: Send email via Supabase (generates magic link and sends email)
      console.log("Sending invite email via Supabase to:", inviteEmail);
      const { error: otpError } = await supabase.auth.signInWithOtp({
          email: inviteEmail,
          options: {
            emailRedirectTo: inviteLink,
            data: {
              company_id: companyId,
              company_name: company.name ?? null,
              invite_token: token,
            },
          },
        });

        if (otpError) {
        console.error("signInWithOtp error (new user):", otpError);
        
        // Check for rate limit error - check status, code, and message content
        const errorMessage = otpError.message?.toLowerCase() || "";
        const isRateLimit = 
          otpError.status === 429 || 
          otpError.code === "over_email_send_rate_limit" ||
          errorMessage.includes("security purposes") ||
          errorMessage.includes("only request this after") ||
          errorMessage.includes("rate limit");
        
        if (isRateLimit) {
          // Extract wait time from error message (e.g., "after 59 seconds")
          const waitTimeMatch = otpError.message?.match(/(\d+)\s*seconds?/i);
          const waitTime = waitTimeMatch ? waitTimeMatch[1] : "59";
          
          await supabase
            .from("company_invites")
            .update({
              status: "email_failed",
              error_message: `Rate limit: ${otpError.message}`,
            })
            .eq("id", inserted.id);

          return new Response(
            JSON.stringify({
              success: false,
              error: "Rate limit exceeded",
              details: `Please wait ${waitTime} seconds before inviting this user again. ${otpError.message || ""}`,
              errorCode: "RATE_LIMIT_EXCEEDED",
              waitTime: parseInt(waitTime),
              inviteLink,
            }),
            { status: 429, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }

        // Other errors
        await supabase
          .from("company_invites")
          .update({
            status: "email_failed",
            error_message: otpError.message ?? String(otpError),
          })
          .eq("id", inserted.id);

        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to send magic link email",
            details: otpError.message ?? String(otpError),
            inviteLink,
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
        );
      }
    } else {
      // ---- Path B: User exists - Try signInWithOtp first, fallback to generateLink if rate limited ----
      authUserId = existingUser.id;

      // Step 1: Try to send email via signInWithOtp (preferred method)
      console.log("Sending invite email via Supabase to existing user:", inviteEmail);
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: inviteEmail,
            options: {
              emailRedirectTo: inviteLink,
              data: {
                company_id: companyId,
                company_name: company.name ?? null,
                invite_token: token,
              },
            },
          });

          if (otpError) {
        console.error("signInWithOtp error (existing user):", otpError);
        
        // Check for rate limit error - check status, code, and message content
        const errorMessage = otpError.message?.toLowerCase() || "";
        const isRateLimit = 
          otpError.status === 429 || 
          otpError.code === "over_email_send_rate_limit" ||
          errorMessage.includes("security purposes") ||
          errorMessage.includes("only request this after") ||
          errorMessage.includes("rate limit");
        
        if (isRateLimit) {
          // Rate limit hit - fallback to generating link manually (no email sent, but link is valid)
          console.warn("Rate limit hit for existing user, falling back to admin.generateLink()");
          
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: inviteEmail,
            options: {
              redirectTo: inviteLink,
            },
          });

          if (linkError || !linkData?.properties?.action_link) {
            // Even fallback failed
            console.error("generateLink fallback also failed:", linkError);
            await supabase
              .from("company_invites")
              .update({
                status: "email_failed",
                error_message: `Rate limited and generateLink failed: ${linkError?.message ?? String(linkError)}`,
              })
              .eq("id", inserted.id);

            // Extract wait time from error message
            const waitTimeMatch = otpError.message?.match(/(\d+)\s*seconds?/i);
            const waitTime = waitTimeMatch ? waitTimeMatch[1] : "59";

            return new Response(
              JSON.stringify({
                success: false,
                error: "Rate limit exceeded",
                details: `Please wait ${waitTime} seconds before inviting this user again. ${otpError.message || ""}`,
                errorCode: "RATE_LIMIT_EXCEEDED",
                waitTime: parseInt(waitTime),
                inviteLink,
              }),
              { status: 429, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }

          // Fallback succeeded - we have a magic link but no email was sent
          const magicLink = linkData.properties.action_link;
          console.log("Generated magic link via fallback (no email sent):", magicLink);
          
          await supabase
            .from("company_invites")
            .update({
              status: "email_sent", // Mark as sent since we have the link
              error_message: `Email rate limited, but magic link generated: ${otpError.message}`,
            })
            .eq("id", inserted.id);

          // Return success with the generated link
          // Note: Email was not sent due to rate limit, but link is valid
          return new Response(
            JSON.stringify({
              success: true,
              inviteId: inserted.id,
              inviteLink,
              magicLink, // Include the generated magic link
              warning: "Email sending was rate limited, but magic link was generated successfully. You can share this link manually.",
              rateLimitInfo: {
                message: otpError.message,
                waitTime: 60, // Default wait time
          },
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }

        // Other errors (not rate limit)
          await supabase
            .from("company_invites")
            .update({
              status: "email_failed",
              error_message: otpError.message ?? String(otpError),
            })
            .eq("id", inserted.id);

          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to send magic link email",
              details: otpError.message ?? String(otpError),
              inviteLink,
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      // signInWithOtp succeeded - email was sent
    }

    // Mark email sent + store auth user id
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