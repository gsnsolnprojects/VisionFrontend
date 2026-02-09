// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import CompanyMembers from "@/components/CompanyMembers";
import { FormFieldWrapper } from "@/components/FormFieldWrapper";
import { useFormValidation } from "@/hooks/useFormValidation";
import {
  companyDetailsSchema,
  projectSchema,
  type CompanyDetailsFormData,
  type ProjectFormData,
} from "@/lib/validations/authSchemas";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { EmptyState } from "@/components/pages/EmptyState";
import { LoadingState } from "@/components/pages/LoadingState";
import { FolderKanban } from "lucide-react";
import ProfileCompletionDialog from "@/components/ProfileCompletionDialog";
import { SimulationView } from "@/components/SimulationView";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { safeText } from "@/lib/utils";
import { sanitizeUrlParam } from "@/lib/xss";

type ViewMode = "overview" | "projects" | "simulation" | "members";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { sessionReady, profile, user, isAdmin: contextIsAdmin, company, reloadProfile, loading: profileLoading } = useProfile();

  const [projects, setProjects] = useState<any[]>([]);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showCompanyExistsDialog, setShowCompanyExistsDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joinRequestLoading, setJoinRequestLoading] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "join">("create");
  const [showProfileCompletionDialog, setShowProfileCompletionDialog] = useState(false);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<{
    company_name: string;
    status: string;
    created_at: string;
  } | null>(null);
  const { setItems: setBreadcrumbs } = useBreadcrumbs();

  // Company Details Form Validation
  const companyForm = useFormValidation({
    schema: companyDetailsSchema,
    initialValues: {
      companyName: "",
      businessEmail: "",
    },
    validateOnChange: false,
    validateOnBlur: true, // Validate on blur for better UX
  });

  // Project Form Validation
  const projectForm = useFormValidation({
    schema: projectSchema,
    initialValues: {
      projectName: "",
      projectDescription: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // sidebar state (kept for internal logic)
  const [activeView, setActiveView] = useState<ViewMode>("overview");

  // Auth check is handled by ProfileContext and AppShell
  // No need for redundant checks here

  // Keep breadcrumbs in sync with the current dashboard view
  useEffect(() => {
    if (activeView === "simulation") {
      setBreadcrumbs([
        { label: "Dashboard", href: "/dashboard" },
        { label: "Projects", href: "/dashboard/projects" },
        { label: "Simulation" },
      ]);
    } else if (activeView === "projects") {
      setBreadcrumbs([
        { label: "Dashboard", href: "/dashboard" },
        { label: "Projects", href: "/dashboard/projects" },
      ]);
    } else {
      // Default: just show Dashboard
      setBreadcrumbs([
        { label: "Dashboard", href: "/dashboard" },
      ]);
    }

    return () => {
      setBreadcrumbs(null);
    };
  }, [activeView, setBreadcrumbs]);

  // Handle invite token from URL (only after session is ready)
  useEffect(() => {
    if (!sessionReady) return;
    const raw = searchParams.get("invite") ?? searchParams.get("project_invite");
    const inviteToken = sanitizeUrlParam(raw?.trim());
    if (inviteToken && user && !profileLoading) {
      handleInviteAcceptance(inviteToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, user, searchParams, profileLoading]);

  // Show profile completion dialog for users with incomplete profiles
  // This includes: invited users, users who joined via join request, and any user missing name/phone
  useEffect(() => {
    if (!sessionReady || profileLoading || !profile) return;
    
    // Check if profile is incomplete (empty or null name or phone)
    const hasIncompleteName = !profile.name || profile.name.trim() === '';
    const hasIncompletePhone = !profile.phone || profile.phone.trim() === '';
    
    // Show dialog if profile is incomplete
    // Priority: Show for users with company_id (invited/joined), but also check all users
    if (hasIncompleteName || hasIncompletePhone) {
      // For users without company_id, only show if they're trying to join (have pending request)
      // For users with company_id, always show
      if (profile.company_id) {
        setShowProfileCompletionDialog(true);
      } else {
        // Check if user has a pending join request - if so, show profile completion
        // This helps ensure join requests show correct name
        const checkPendingRequest = async () => {
          const { data: pendingRequest } = await supabase
            .from("workspace_join_requests")
            .select("id")
            .eq("user_id", user?.id)
            .in("status", ["pending", "email_sent"])
            .maybeSingle();
          
          if (pendingRequest) {
            setShowProfileCompletionDialog(true);
          }
        };
        
        checkPendingRequest();
      }
    }
  }, [sessionReady, profileLoading, profile, user?.id]);

  // Fetch latest pending join request for the current user so they can see "pending" state
  // across refreshes (supports CC_57: pending request state retained after refresh)
  useEffect(() => {
    if (!sessionReady || profileLoading || !user?.id) {
      setPendingJoinRequest(null);
      return;
    }

    const fetchPendingJoinRequest = async () => {
      try {
        const { data, error } = await supabase
          .from("workspace_join_requests")
          .select("company_name, status, created_at")
          .eq("user_id", user.id)
          .in("status", ["pending", "email_sent"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[Dashboard] Error fetching pending join request:", error);
          return;
        }

        setPendingJoinRequest(data || null);
      } catch (err) {
        console.error("[Dashboard] Unexpected error fetching pending join request:", err);
      }
    };

    fetchPendingJoinRequest();
  }, [sessionReady, profileLoading, user?.id]);

  // Handle join request approve/reject from email links
  const handleJoinRequestFromEmail = async (token: string, action: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to process this request.",
        variant: "destructive",
      });
      return;
    }

    try {
      const functionName = action === "approve" 
        ? "approve-workspace-request" 
        : "reject-workspace-request";
      
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: { token },
      });
      
      if (error) {
        throw new Error(error.message || `Failed to ${action} request`);
      }

      toast({
        title: action === "approve" ? "Request approved" : "Request rejected",
        description: action === "approve" 
          ? "The user has been added to the company." 
          : "The join request has been rejected.",
      });

      // Reload profile in case user was added to company
      if (action === "approve") {
        await reloadProfile();
      }
    } catch (error: any) {
      console.error(`Error ${action}ing join request:`, error);
      toast({
        title: `Failed to ${action} request`,
        description: error.message || "An error occurred while processing the request.",
        variant: "destructive",
      });
    }
  };

  // Handle URL action and view parameters
  useEffect(() => {
    const action = searchParams.get("action");
    const view = searchParams.get("view");
    const token = searchParams.get("token");
    
    // Handle view parameter (e.g., ?view=simulation)
    if (view && ["overview", "projects", "simulation", "members"].includes(view)) {
      setActiveView(view as ViewMode);
      // Keep view param in URL so sidebar can read it for active state
    } else if (!view) {
      // If no view param, default to overview
      setActiveView("overview");
    }
    
    // Handle join request approve/reject from email links
    const safeToken = sanitizeUrlParam(token);
    if (safeToken && (action === "approve" || action === "reject")) {
      handleJoinRequestFromEmail(safeToken, action);
      // Clear params after handling
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("token");
      newParams.delete("action");
      setSearchParams(newParams);
      return;
    }
    
    if (action === "create-project") {
      if (profile?.company_id) {
      setShowProjectDialog(true);
      // Clear the action param from URL
      setSearchParams({});
      } else {
        // User tried to access create-project route without company
        toast({
          title: "Company required",
          description: "Please create or join a company before creating a project.",
          variant: "destructive",
        });
        // Clear the action param and redirect to dashboard
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("action");
        setSearchParams(newParams);
        // Ensure we're on the dashboard
        if (location.pathname !== "/dashboard") {
          navigate("/dashboard", { replace: true });
        }
      }
    } else if (action === "join-company") {
      setDialogMode("join");
      setShowCompanyDialog(true);
      companyForm.resetForm();
      // Clear the action param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      setSearchParams(newParams);
    } else if (action === "create-company") {
      setDialogMode("create");
      setShowCompanyDialog(true);
      companyForm.resetForm();
      // Clear the action param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      setSearchParams(newParams);
    }
  }, [searchParams, profile, setSearchParams, companyForm]);

  const handleInviteAcceptance = async (inviteToken: string) => {
    if (!user) return;

    try {
      // Validate invite first
      const { data: validateJson, error: validateError } = await supabase.functions.invoke("validate-invite", {
        body: { token: inviteToken },
      });

      if (validateError || !validateJson?.ok) {
        // Invalid invite - clear token and continue normal flow
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("invite");
        newParams.delete("project_invite");
        setSearchParams(newParams);
        return;
      }

      const invite = validateJson.invite;
      if (!invite || invite.status !== "pending") {
        return;
      }

      // Check if user's email matches invite email
      const userEmail = user.email;
      if (userEmail !== invite.email) {
        toast({
          title: "Invite email mismatch",
          description: "This invite is for a different email address.",
          variant: "destructive",
        });
        return;
      }

      // Accept the invite
      if (!inviteToken || !inviteToken.trim() || !user?.id) {
        console.warn("Skipping accept-invite from dashboard due to missing token or userId", {
          hasToken: !!inviteToken,
          hasUserId: !!user?.id,
        });
        return;
      }

      const { data: acceptJson, error: acceptError } = await supabase.functions.invoke("accept-invite", {
        body: { token: inviteToken.trim(), userId: user.id },
      });

      const accepted = acceptJson?.ok || acceptJson?.error === "invite already accepted";
      if (accepted) {
        toast({
          title: acceptJson?.error === "invite already accepted" ? "Already a member" : "Invite accepted",
          description: "You have been added to the company.",
        });
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("invite");
        newParams.delete("project_invite");
        setSearchParams(newParams);
        await reloadProfile();
      } else {
        toast({
          title: "Failed to accept invite",
          description: acceptJson?.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error handling invite:", error);
    }
  };

  const checkForValidInvite = async (): Promise<boolean> => {
    const inviteToken = sanitizeUrlParam((searchParams.get("invite") ?? searchParams.get("project_invite"))?.trim());
    if (!inviteToken) return false;

    try {
      const { data: json, error } = await supabase.functions.invoke("validate-invite", {
        body: { token: inviteToken },
      });
      
      if (!error && json?.ok && json.invite?.status === "pending") {
        // Check if email matches
        const userEmail = user?.email;
        return userEmail === json.invite.email;
      }
    } catch (error) {
      console.error("Error checking invite:", error);
    }
    return false;
  };

  // Load projects when profile/company changes (only after session is ready and user exists)
  useEffect(() => {
    // Early return if session not ready
    if (!sessionReady) return;

    // Don't load if no user
    if (sessionReady && !user) return;

    // Load projects only when session ready, user exists, and profile has company_id
    if (sessionReady && user && profile?.company_id) {
      // Load projects as soon as company_id is available (parallel with other operations)
      loadProjects(profile.company_id);
    }
  }, [sessionReady, user?.id, profile?.company_id]);

  // Show company dialog if user has no company and no valid invite
  useEffect(() => {
    if (!profileLoading && !profile?.company_id) {
      let cancelled = false;
      checkForValidInvite().then((hasValidInvite) => {
        if (!cancelled && !hasValidInvite) {
          setDialogMode("create");
          setShowCompanyDialog(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, profile?.company_id]);

  // Listen for "Manage Members" button click from Sidebar (backward compatibility)
  useEffect(() => {
    const handleShowMembers = () => {
      // Use contextIsAdmin directly instead of isAdmin variable
      if (contextIsAdmin && profile?.company_id) {
        // Navigate to members page instead of changing view
        navigate("/dashboard/team/members");
      }
    };

    window.addEventListener("showMembersView", handleShowMembers);
    return () => {
      window.removeEventListener("showMembersView", handleShowMembers);
    };
  }, [contextIsAdmin, profile?.company_id, navigate]);

  const loadProjects = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading projects:", error);
        return;
      }

      if (data) setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };


  const handleSaveCompany = async () => {
    if (!companyForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before saving company details.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "No authenticated user found.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Trim and normalize company name for comparison (case-insensitive, no whitespace)
    const companyName = companyForm.values.companyName.trim();
    const businessEmail = companyForm.values.businessEmail;

    try {
      // Check if company already exists using the SECURITY DEFINER function
      // This bypasses RLS to allow existence checks even if user is not a member
      let existingCompany = null;
      
      try {
        const { data: existingCompanyData, error: checkError } = await supabase
          .rpc("check_company_exists", { company_name: companyName });

        if (checkError) {
          // If RPC function doesn't exist or fails, try direct query as fallback
          // This handles the case where migration hasn't been applied yet
          console.warn("RPC check_company_exists failed, trying direct query:", checkError);
          
          // Fallback: Try direct query (will work if user is admin/member, but may fail due to RLS)
          // Use case-insensitive comparison with ilike for fallback
          // Note: This may still fail due to RLS if user is not a member, but we try anyway
          const { data: directQueryData, error: directError } = await supabase
            .from("companies")
            .select("id, name, admin_email")
            .ilike("name", companyName.trim())
            .maybeSingle();
          
          if (!directError && directQueryData) {
            existingCompany = directQueryData;
          } else {
            // If both fail, log error but don't proceed with creation
            // This prevents creating duplicate companies
            console.error("Both RPC and direct query failed to check company existence:", {
              rpcError: checkError,
              directError: directError
            });
            setLoading(false);
            toast({
              title: "Error",
              description: "Unable to verify if company exists. Please try again or contact support.",
              variant: "destructive",
            });
            return;
          }
        } else {
          // RPC function succeeded, get the first result
          existingCompany = existingCompanyData && existingCompanyData.length > 0 
            ? existingCompanyData[0] 
            : null;
        }
      } catch (rpcException: any) {
        // Catch any unexpected errors in the RPC call
        console.error("Exception checking company existence:", rpcException);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to check if company exists. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (existingCompany) {
        // Company exists - show confirmation dialog
        // Store the existing company's admin_email for the join request
        setLoading(false);
        setShowCompanyExistsDialog(true);
        return;
      }

      // Company doesn't exist - create it and assign user as admin
      // Get user's email (from auth user or profile)
      const userEmail = user.email || profile?.email;
      
      // Ensure profile exists before creating company (required for foreign key)
      let currentProfile = profile;
      
      if (!currentProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            name: user.user_metadata?.name || "",
            phone: user.user_metadata?.phone || "",
            email: userEmail || "",
          }, {
            onConflict: "id",
          });
        
        if (profileError) {
          console.error("Error creating profile:", profileError);
          throw new Error("Failed to create profile. Please try again.");
        }
        
        // Wait a moment for the profile to be committed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload profile to ensure it's available
        await reloadProfile();
        
        // Fetch the profile we just created
        const { data: profileData, error: profileFetchError } = await supabase
          .from("profiles")
          .select("id, email, name")
          .eq("id", user.id)
          .single();
        
        if (profileFetchError || !profileData) {
          console.error("Profile fetch error:", profileFetchError);
          throw new Error("Profile was created but could not be retrieved. Please refresh and try again.");
        }
        
        currentProfile = profileData;
      }
      
      // Use email from profile
      const profileEmail = currentProfile.email || userEmail;
      if (!profileEmail) {
        throw new Error("Unable to get email for company creation. Please ensure your profile has an email.");
      }
      
      // Use Edge Function to create company (bypasses RLS issues)
      const { data: createCompanyData, error: invokeError } = await supabase.functions.invoke("create-company", {
        body: {
          companyName,
          adminEmail: profileEmail,
        },
      });

      // Handle errors - extract actual error message from Edge Function response
      if (invokeError) {
        console.error("Company creation error:", invokeError);
        console.error("Error context:", invokeError.context);
        console.error("Response data:", createCompanyData);
        
        let errorMessage = "Failed to create company";
        
        // Priority 1: Check if data contains error message (Edge Function's JSON response)
        // Sometimes data is populated even when there's an error
        if (createCompanyData?.error) {
          errorMessage = createCompanyData.error;
          // Include details if available
          if (createCompanyData.details) {
            errorMessage += `: ${createCompanyData.details}`;
          }
        } else if (createCompanyData && typeof createCompanyData === 'object' && 'error' in createCompanyData) {
          errorMessage = (createCompanyData as any).error;
          if ((createCompanyData as any).details) {
            errorMessage += `: ${(createCompanyData as any).details}`;
          }
        }
        // Priority 2: Check error.context (FunctionsHttpError) - contains the actual response body
        else if (invokeError.context) {
          try {
            // error.context might be a Response object or already parsed
            let errorData: any;
            if (typeof invokeError.context.json === 'function') {
              errorData = await invokeError.context.json();
            } else if (typeof invokeError.context === 'object') {
              errorData = invokeError.context;
            }
            
            if (errorData?.error) {
              errorMessage = errorData.error;
              if (errorData.details) {
                errorMessage += `: ${errorData.details}`;
              }
            } else if (errorData?.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            // If parsing fails, fall back to error message
            console.warn("Could not parse error context:", parseError);
          }
        }
        // Priority 3: Use error message
        else if (invokeError.message) {
          errorMessage = invokeError.message;
        }
        
        throw new Error(errorMessage);
      }

      if (!createCompanyData?.ok) {
        let errorMsg = createCompanyData?.error || "Failed to create company";
        // Include details if available
        if (createCompanyData?.details) {
          errorMsg += `: ${createCompanyData.details}`;
        }
        console.error("Company creation error:", createCompanyData);
        throw new Error(errorMsg);
      }

      const company = createCompanyData.company;
      
      if (!company) {
        throw new Error("Failed to create company");
      }

      // Profile is already updated by the edge function, but verify
      const { data: profileRow, error: profileUpdateError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileUpdateError) {
        console.error("Error verifying profile update:", profileUpdateError);
        // Company was created, profile should be updated by edge function
        // Just reload profile to sync state
      }
      setShowCompanyDialog(false);
      companyForm.resetForm();
      
      // Small delay to ensure Edge Function has committed the profile update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload profile to get updated company_id and email
      await reloadProfile();
      
      // Wait a bit more for context to update after reload
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify admin status after reload (use the context values already available)
      if (import.meta.env.DEV) {
        console.log("[Dashboard] After company creation:", {
          hasProfile: !!profile,
          hasCompany: !!profile?.company_id,
          isAdmin: contextIsAdmin,
          profileEmail: profile?.email,
          companyAdminEmail: profile?.companies?.admin_email,
          companyFromContext: company?.admin_email,
        });
      }
      
      if (company?.id) {
        loadProjects(company.id);
      }

      toast({
        title: "Company details saved successfully",
        description: "Your company has been created successfully.",
      });
    } catch (error: any) {
      console.error("Error saving company - Full error object:", error);
      console.error("Error details:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        status: error?.status,
        statusText: error?.statusText,
      });
      
      // Show more detailed error message
      const errorMessage = 
        error?.details || 
        error?.hint || 
        error?.message || 
        "Failed to save company.";
      
      toast({
        title: "Company details failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJoinRequest = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "No authenticated user found.",
        variant: "destructive",
      });
      return;
    }

    // Prevent duplicate join requests for the same user while a request is pending
    try {
      const { data: existingRequest } = await supabase
        .from("workspace_join_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "email_sent"])
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "Request already pending",
          description: "You already have a join request pending. Please wait for the admin to respond.",
        });
        return;
      }
    } catch (checkError) {
      console.error("Error checking existing join request:", checkError);
      // If this check fails, we continue with the existing flow to avoid blocking the user
    }

    if (!companyForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before sending join request.",
        variant: "destructive",
      });
      return;
    }

    // Check if profile has name and phone before sending join request
    // This ensures admin sees correct name in join requests
    if (profile) {
      const hasIncompleteName = !profile.name || profile.name.trim() === '';
      const hasIncompletePhone = !profile.phone || profile.phone.trim() === '';
      
      if (hasIncompleteName || hasIncompletePhone) {
        toast({
          title: "Complete your profile",
          description: "Please complete your profile (name and phone) before joining a company.",
          variant: "destructive",
        });
        setShowProfileCompletionDialog(true);
        setShowCompanyExistsDialog(false); // Close company exists dialog
        return;
      }
    }

    setJoinRequestLoading(true);
    try {
      // Trim and normalize company name for comparison
      const companyName = companyForm.values.companyName.trim();
      
      // Get the existing company to get the actual admin_email using the SECURITY DEFINER function
      // This bypasses RLS to allow fetching admin_email even if user is not a member
      const { data: existingCompanyData, error: fetchError } = await supabase
        .rpc("check_company_exists", { company_name: companyName });

      if (fetchError) {
        throw fetchError;
      }

      // The RPC function returns an array, get the first result
      const existingCompany = existingCompanyData && existingCompanyData.length > 0 
        ? existingCompanyData[0] 
        : null;

      if (!existingCompany) {
        throw new Error("Company not found");
      }

      // Get user profile to get email
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error("Profile not found");
      }

      // Create join request via edge function using the actual admin_email from the company
      const { error } = await supabase.functions.invoke("send-workspace-request", {
        body: {
          userId: user.id,
          companyName: companyName,
          adminEmail: existingCompany.admin_email, // Use actual admin email from company, not form input
        },
      });

      if (error) throw error;

      toast({
        title: "Request sent successfully",
        description: "The workspace admin has been notified by email.",
      });

      // Update local pending state so the user sees a persistent "pending" banner
      setPendingJoinRequest({
        company_name: companyName,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      setShowCompanyExistsDialog(false);
      // Keep company dialog open (user not yet in company)
    } catch (error: any) {
      console.error("Error creating join request:", error);
      toast({
        title: "Join request failed",
        description: error.message ?? "Failed to send join request.",
        variant: "destructive",
      });
    } finally {
      setJoinRequestLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!companyForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before joining company.",
        variant: "destructive",
      });
      return;
    }

    // Prevent duplicate join requests for the same user while a request is pending
    try {
      const { data: existingRequest } = await supabase
        .from("workspace_join_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "email_sent"])
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "Request already pending",
          description: "You already have a join request pending. Please wait for the admin to respond.",
        });
        return;
      }
    } catch (checkError) {
      console.error("Error checking existing join request:", checkError);
      // If this check fails, we continue with the existing flow to avoid blocking the user
    }

    if (!user) {
      toast({
        title: "Error",
        description: "No authenticated user found.",
        variant: "destructive",
      });
      return;
    }

    // Check if profile has name and phone before sending join request
    // This ensures admin sees correct name in join requests
    if (profile) {
      const hasIncompleteName = !profile.name || profile.name.trim() === '';
      const hasIncompletePhone = !profile.phone || profile.phone.trim() === '';
      
      if (hasIncompleteName || hasIncompletePhone) {
        toast({
          title: "Complete your profile",
          description: "Please complete your profile (name and phone) before joining a company.",
          variant: "destructive",
        });
        setShowProfileCompletionDialog(true);
        return;
      }
    }

    setJoinRequestLoading(true);
    try {
      // Trim and normalize company name for comparison
      const companyName = companyForm.values.companyName.trim();
      
      // Check if company exists by name using the SECURITY DEFINER function
      // This bypasses RLS to allow existence checks even if user is not a member
      const { data: existingCompanyData, error: fetchError } = await supabase
        .rpc("check_company_exists", { company_name: companyName });

      if (fetchError) {
        console.error("Error checking company existence:", fetchError);
        toast({
          title: "Error",
          description: "Failed to check if company exists. Please try again.",
          variant: "destructive",
        });
        setJoinRequestLoading(false);
        return;
      }

      // The RPC function returns an array, get the first result
      const existingCompany = existingCompanyData && existingCompanyData.length > 0 
        ? existingCompanyData[0] 
        : null;

      if (!existingCompany) {
        toast({
          title: "Company not found",
          description: `Company "${companyName}" not found. Please check the company name or create a new company.`,
          variant: "destructive",
        });
        setJoinRequestLoading(false);
        return;
      }

      // Send join request
      const { error } = await supabase.functions.invoke("send-workspace-request", {
        body: {
          userId: user.id,
          companyName: companyName,
          adminEmail: existingCompany.admin_email,
        },
      });

      if (error) throw error;

      toast({
        title: "Request sent successfully",
        description: "The workspace admin has been notified by email.",
      });

      // Update local pending state so the user sees a persistent "pending" banner
      setPendingJoinRequest({
        company_name: companyName,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      setShowCompanyDialog(false);
      companyForm.resetForm();
    } catch (error: any) {
      console.error("Error creating join request:", error);
      toast({
        title: "Join request failed",
        description: error.message ?? "Failed to send join request.",
        variant: "destructive",
      });
    } finally {
      setJoinRequestLoading(false);
    }
  };

  const openCreateProject = () => {
    if (!profile || !profile.company_id) {
      toast({
        title: "Company required",
        description: "Please join a company or create a company before creating a project.",
        variant: "destructive",
      });
      setDialogMode("create");
      setShowCompanyDialog(true);
      return;
    }
    setShowProjectDialog(true);
  };

  const handleCreateProject = async () => {
    if (!projectForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before creating project.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !profile?.company_id) {
      toast({
        title: "Error",
        description: "No authenticated user or company found.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const projectName = projectForm.values.projectName;
      const projectDescription = projectForm.values.projectDescription || "";

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: projectDescription,
          company_id: profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError || !project) {
        throw projectError || new Error("Failed to create project");
      }

      // Immediately add the new project to the state so it appears in "Manage Projects" without reload
      setProjects((prevProjects) => {
        // Check if project already exists to avoid duplicates
        const exists = prevProjects.some((p) => p.id === project.id);
        if (exists) return prevProjects;
        return [project, ...prevProjects];
      });

      // Refresh the projects list in the background to ensure we have the latest data
      // Don't await this since we're navigating away - it will complete in the background
      loadProjects(profile.company_id).catch((error) => {
        console.error("Error refreshing projects list:", error);
        // Don't show error to user since we already added the project optimistically
      });

      setShowProjectDialog(false);
      projectForm.resetForm();

      // navigate to dataset manager for the newly created project
      navigate(`/dataset/${project.id}`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Project creation failed",
        description: error.message ?? "Failed to create project.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate display name: profile name > user full_name > user email (never show "User" if session exists)
  const displayName = profileLoading
    ? "Loading..."
    : profile?.name || user?.user_metadata?.full_name || user?.email || "";

  const isAdmin = contextIsAdmin;
  const hasCompany = !!profile?.company_id;

  // Show loading state while profile is being loaded
  if (profileLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <div>
      {activeView !== "simulation" && (
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
        >
          <PageHeader
            title={`Welcome, ${displayName}`}
            description="Manage your projects, datasets, and simulation workspace from this dashboard."
          />
        </motion.div>
      )}

      {/* Banner: show pending join request status for the current user */}
      {pendingJoinRequest && !profile?.company_id && (
        <div className="mx-auto mb-4 max-w-3xl rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-900 dark:text-yellow-100">
            Join request pending
          </p>
          <p className="text-xs text-muted-foreground">
            Your request to join{" "}
            <span className="font-semibold">
              {pendingJoinRequest.company_name || "the workspace"}
            </span>{" "}
            is pending admin approval.
          </p>
        </div>
      )}

      {/* CONTENT: Overview placeholder (default) */}
      {activeView === "overview" && !profile?.company_id && (
        <EmptyState
          icon={FolderKanban}
          title="Welcome to VisionM"
          description="Get started by creating a company to organize your projects and datasets."
          action={{
            label: "Create Workspace",
            onClick: () => {
              setDialogMode("create");
              setShowCompanyDialog(true);
            },
          }}
        />
      )}

      {/* Dashboard Overview - shown when user has a company */}
      {activeView === "overview" && profile?.company_id && (
        <DashboardOverview 
          projects={projects}
          profile={profile}
          onCreateProject={openCreateProject}
        />
      )}

      {/* Manage Projects view (still available via sidebar "Manage Projects") */}
      {activeView === "projects" && (
        <div>
          <h3 className="text-2xl font-semibold mb-2">Manage Projects</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Select a project to manage its dataset.
          </p>

          <ul className="space-y-2 max-w-xl">
            {projects.length > 0 ? (
              projects.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(`/dataset/${p.id}`)}
                    className="w-full text-left px-4 py-3 rounded border hover:bg-muted flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{safeText(p.name)}</div>
                      <div className="text-xs text-muted-foreground">
                        {safeText(p.description) || "No description"}
                      </div>
                    </div>
                    <div className="text-sm text-primary">Open</div>
                  </button>
                </li>
              ))
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Use the left sidebar to create your first project."
                action={contextIsAdmin || (profile?.role && ["platform_admin", "workspace_admin"].includes(profile.role)) ? {
                  label: "Create Project",
                  onClick: openCreateProject,
                } : undefined}
              />
            )}
          </ul>
        </div>
      )}

      {/* Simulation view */}
      {activeView === "simulation" && (
        <SimulationView
          projects={projects}
          profile={profile}
        />
      )}

      {/* Members view */}
      {activeView === "members" && profile?.company_id && (
        <CompanyMembers
          companyId={profile.company_id}
          company={profile.companies}
          isAdmin={isAdmin}
        />
      )}

      {/* Company Details Dialog */}
      <Dialog 
        open={showCompanyDialog} 
        onOpenChange={setShowCompanyDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "join" ? "Join Company" : "Company Details"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "join" 
                ? "Enter the company name and email to request access."
                : "Please provide your company information to continue."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormFieldWrapper
              label="Company Name"
              name="companyName"
              type="text"
              value={companyForm.values.companyName}
              onChange={companyForm.handleChange("companyName")}
              onBlur={companyForm.handleBlur("companyName")}
              error={companyForm.getFieldError("companyName")}
              touched={companyForm.isFieldTouched("companyName")}
              placeholder="Enter company name"
              required
            />
            <FormFieldWrapper
              label="Company Email"
              name="businessEmail"
              type="email"
              value={companyForm.values.businessEmail}
              onChange={companyForm.handleChange("businessEmail")}
              onBlur={companyForm.handleBlur("businessEmail")}
              error={companyForm.getFieldError("businessEmail")}
              touched={companyForm.isFieldTouched("businessEmail")}
              placeholder="company@example.com"
              required
            />
          </div>
          <DialogFooter className="justify-end">
            {dialogMode === "join" ? (
              <Button onClick={handleJoinCompany} disabled={joinRequestLoading}>
                {joinRequestLoading ? "Sending..." : "Join"}
              </Button>
            ) : (
              <Button onClick={handleSaveCompany} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Exists Confirmation Dialog */}
      <Dialog open={showCompanyExistsDialog} onOpenChange={setShowCompanyExistsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Company Already Exists</DialogTitle>
            <DialogDescription>
              This company already exists. Do you want to send a join request to the admin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-end">
            <Button
              onClick={handleCreateJoinRequest}
              disabled={joinRequestLoading}
            >
              {joinRequestLoading ? "Sending..." : "Yes, Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your datasets and training jobs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormFieldWrapper
              label="Project Name"
              name="projectName"
              type="text"
              value={projectForm.values.projectName}
              onChange={projectForm.handleChange("projectName")}
              onBlur={projectForm.handleBlur("projectName")}
              error={projectForm.getFieldError("projectName")}
              touched={projectForm.isFieldTouched("projectName")}
              placeholder="Enter project name"
              required
            />
            <div>
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                value={projectForm.values.projectDescription || ""}
                onChange={(e) => projectForm.setValue("projectDescription", e.target.value)}
                placeholder="Enter project description"
                className={
                  projectForm.isFieldTouched("projectDescription") &&
                  projectForm.getFieldError("projectDescription")
                    ? "border-destructive"
                    : ""
                }
              />
              {projectForm.isFieldTouched("projectDescription") &&
                projectForm.getFieldError("projectDescription") && (
                  <p className="mt-1 text-xs text-destructive" role="alert">
                    {projectForm.getFieldError("projectDescription")}
                  </p>
                )}
            </div>
          </div>
          <DialogFooter className="justify-end">
            <Button onClick={handleCreateProject} disabled={loading}>{loading ? "Creating..." : "Create Project"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Completion Dialog for invited users */}
      {user && (
        <ProfileCompletionDialog
          open={showProfileCompletionDialog}
          onComplete={() => {
            setShowProfileCompletionDialog(false);
            reloadProfile();
          }}
          userEmail={user.email || ''}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;