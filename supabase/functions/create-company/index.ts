import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user token and get user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let companyName: string;
    let adminEmail: string;
    let description: string | undefined;
    
    try {
      const body = await req.json();
      companyName = body.companyName;
      adminEmail = body.adminEmail;
      description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : undefined;
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid request body",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!companyName || !adminEmail) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Company name and admin email are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ensure profile exists (using service role, bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // Create profile if it doesn't exist
      const { error: createProfileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: user.user_metadata?.name || "",
          phone: user.user_metadata?.phone || "",
          email: user.email ?? adminEmail,
        }, {
          onConflict: "id",
        });

      if (createProfileError) {
        console.error("Error creating profile:", createProfileError);
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Failed to create or verify profile",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Check if company already exists (case-insensitive, trimmed)
    // Normalize company name for comparison
    const normalizedCompanyName = companyName.trim().toLowerCase();
    const { data: allCompanies } = await supabase
      .from("companies")
      .select("id, name");
    
    // Find case-insensitive match
    const existingCompany = allCompanies?.find(
      (c: any) => c.name && c.name.trim().toLowerCase() === normalizedCompanyName
    );

    if (existingCompany) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Company already exists",
          company: existingCompany,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create company (using service role, bypasses RLS)
    // Trim company name before inserting to ensure consistency
    // admin_email is the creator's login email (join requests and admin checks match it against
    // profile.email); email is the "Company Email" typed in the form, the company's contact address
    const insertPayload: Record<string, unknown> = {
      name: companyName.trim(),
      admin_email: user.email ?? adminEmail,
      email: adminEmail,
      created_by: user.id,
    };
    if (description) {
      insertPayload.description = description;
    }
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert(insertPayload)
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      console.error("Company error code:", companyError.code);
      console.error("Company error details:", companyError.details);
      console.error("Company error hint:", companyError.hint);
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to create company";
      if (companyError.code === "23503") {
        errorMessage = "Profile not found. Please ensure your profile exists.";
      } else if (companyError.code === "23502") {
        errorMessage = "Missing required fields. Please check your input.";
      } else if (companyError.code === "23505") {
        errorMessage = "Company with this name already exists.";
      } else if (companyError.message) {
        errorMessage = companyError.message;
      }
      
      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          details: companyError.message,
          code: companyError.code,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update profile with company_id and role='workspace_admin' for the company creator.
    // The profile email stays the person's login email (it used to be overwritten with the
    // company email, which showed the wrong address everywhere).
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ 
        company_id: company.id,
        role: 'workspace_admin', // Set creator as workspace_admin
      })
      .eq("id", user.id);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      // Don't fail - company was created successfully
    }

    return new Response(
      JSON.stringify({
        ok: true,
        company,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

