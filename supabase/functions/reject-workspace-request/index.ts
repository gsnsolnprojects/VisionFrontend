import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    // Support token from query params (for email links) or body (for invoke)
    let token = url.searchParams.get("token");

    if (!token) {
      try {
        const body = await req.json().catch(() => ({}));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token = (body as any)?.token;
      } catch {
        // If JSON parsing fails, token stays null
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1) Get join request
    const { data: request, error: fetchError } = await supabase
      .from("workspace_join_requests")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ success: false, error: "Request not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 2) Update request status to rejected (hidden from list in UI)
    const { error: updateError } = await supabase
      .from("workspace_join_requests")
      .update({ status: "rejected" })
      .eq("token", token);

    if (updateError) {
      throw updateError;
    }

    // 3) Return JSON response (for Dashboard handler) or HTML (for direct browser access)
    const acceptHeader = req.headers.get("accept") || "";
    const isJsonRequest =
      acceptHeader.includes("application/json") ||
      req.headers.get("content-type")?.includes("application/json");

    if (isJsonRequest) {
      // Return JSON for Dashboard handler
      return new Response(
        JSON.stringify({
          success: true,
          message: "Request rejected",
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    } else {
      // Return HTML for direct browser access (email links)
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Request Rejected</title>
            <style>
              body { font-family: system-ui; padding: 40px; text-align: center; }
              .error { color: #ef4444; font-size: 48px; }
            </style>
          </head>
          <body>
            <div class="error">×</div>
            <h1>Workspace Request Rejected</h1>
            <p>The user's request to join the workspace has been rejected.</p>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

serve(handler);
