import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Roles an approver may assign to someone joining an existing company.
// platform_admin is deliberately not assignable here.
const ASSIGNABLE_ROLES = ["viewer", "operator", "ml_engineer", "workspace_admin"];
const ADMIN_ROLES = ["workspace_admin", "admin"];

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight FIRST - before any initialization
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Initialize environment variables after OPTIONS check
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const frontendUrl = Deno.env.get("FRONTEND_URL");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseKey || !frontendUrl) {
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  try {
    const url = new URL(req.url);
    // Support token from query params (for email links) or body (for invoke)
    let token = url.searchParams.get("token");
    let requestedRole: unknown = url.searchParams.get("role");

    if (!token || !requestedRole) {
      try {
        const body = await req.json().catch(() => ({}));
        token = token || body?.token;
        requestedRole = requestedRole || body?.role;
      } catch {
        // If JSON parsing fails, token stays null
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Role for the new member; defaults to viewer when none is given
    const role = requestedRole ? String(requestedRole) : "viewer";
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role: ${role}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 0) Identify the person approving (must be signed in)
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: authData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
    const approverUser = authData?.user;
    if (!approverUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Please sign in to approve join requests" }),
        { status: 401, headers: corsHeaders }
      );
    }
    const { data: approver } = await supabase
      .from("profiles")
      .select("email, role, company_id")
      .eq("id", approverUser.id)
      .maybeSingle();

    // 1) Get join request
    const { data: request, error: fetchError } = await supabase
      .from("workspace_join_requests")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ success: false, error: "Request not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2) Find the company being joined
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("name", request.company_name)
      .eq("admin_email", request.admin_email)
      .maybeSingle();

    let companyId = existingCompany?.id as string | undefined;
    let isNewCompany = false;

    // 3) Only the request's admin, an admin of that company, or a platform admin may approve
    const approverEmail = (approver?.email || approverUser.email || "").toLowerCase();
    const canApprove =
      approver?.role === "platform_admin" ||
      approverEmail === String(request.admin_email || "").toLowerCase() ||
      (!!companyId && approver?.company_id === companyId && ADMIN_ROLES.includes(approver?.role ?? ""));
    if (!canApprove) {
      return new Response(
        JSON.stringify({ success: false, error: "Only an admin of this company can approve join requests" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 4) Update request status to approved
    const { error: updateError } = await supabase
      .from("workspace_join_requests")
      .update({ status: "approved" })
      .eq("token", token);

    if (updateError) throw updateError;

    if (!companyId) {
      // Get requester's email from their profile to set as admin (consistent with Side Panel logic)
      const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", request.user_id)
        .maybeSingle();

      if (!requesterProfile?.email) {
        throw new Error("Requester email not found. Cannot create company.");
      }

      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: request.company_name,
          admin_email: requesterProfile.email, // Use requester's email to ensure they are admin (consistent with Side Panel)
          created_by: request.user_id,
        })
        .select()
        .single();

      if (companyError) throw companyError;
      companyId = newCompany.id;
      isNewCompany = true; // Mark that we created a new company
    }

    // 5) Update user profile with company_id and set role
    // If company was just created, requester is workspace_admin (role='workspace_admin')
    // Otherwise, user joins the existing company with the role the approver picked
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_id: companyId,
        role: isNewCompany ? 'workspace_admin' : role
      })
      .eq("id", request.user_id);

    if (profileError) throw profileError;

    // 6) Fetch user email + name for notification
    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", request.user_id)
      .single();

    if (profileFetchError) {
      console.error("Could not fetch profile for email:", profileFetchError);
    } else if (profile?.email && resend) {
      const authLink = `${frontendUrl}/auth`;
      const workspaceLink = `${frontendUrl}/dashboard`;

      // 7) Send approval email to user (if Resend is configured)
      try {
      await resend.emails.send({
        from: "VisionM <no-reply@visionm.com>",
        to: [profile.email],
        subject: "Workspace Access Approved",
        html: `
          <h1>Access Approved</h1>
          <p>Hi ${profile.name ?? ""},</p>
          <p>Your request to join the workspace for <strong>${request.company_name}</strong> has been approved.</p>
            <p>You can sign in and access your workspace using the links below:</p>
          <p>
              <a href="${authLink}" style="display:inline-block;padding:10px 18px;margin-right:8px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;">
                Sign In to Workspace
              </a>
              <a href="${workspaceLink}" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;">
              Open Workspace
            </a>
          </p>
            <p><small>If you're not already signed in, you'll be redirected to the sign-in page when you click "Open Workspace".</small></p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        // Don't fail the whole operation if email fails
      }
    } else if (profile?.email && !resend) {
      console.warn("Resend API key not configured - skipping approval email");
    }

    // 8) Return JSON response (for Dashboard handler) or HTML (for direct browser access)
    const acceptHeader = req.headers.get("accept") || "";
    const isJsonRequest = acceptHeader.includes("application/json") || req.headers.get("content-type")?.includes("application/json");

    if (isJsonRequest) {
      // Return JSON for Dashboard handler
      return new Response(
        JSON.stringify({
          success: true,
          message: "Request approved",
          companyId: companyId,
          role: isNewCompany ? "workspace_admin" : role,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Return HTML for direct browser access (email links)
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Request Approved</title>
            <style>
              body { font-family: system-ui; padding: 40px; text-align: center; }
              .success { color: #22c55e; font-size: 48px; }
            </style>
          </head>
          <body>
            <div class="success">✓</div>
            <h1>Workspace Request Approved</h1>
            <p>The user has been added to the workspace and notified by email.</p>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
