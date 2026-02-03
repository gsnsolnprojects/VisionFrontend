import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RequestItem } from "@/components/RequestItem";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface JoinRequestsSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminEmail: string;
  onRequestProcessed?: () => void;
}

interface JoinRequest {
  id: string;
  company_name: string;
  admin_email: string;
  status: string;
  created_at: string;
  user_id: string;
  token: string;
  profiles: {
    name: string;
    email: string;
    phone?: string;
  } | null;
}

export const JoinRequestsSidePanel: React.FC<JoinRequestsSidePanelProps> = ({
  open,
  onOpenChange,
  adminEmail,
  onRequestProcessed,
}) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    if (!adminEmail) return;

    setLoading(true);
    try {
      // Fetch requests first - include pending, email_sent, and approved (exclude ignored)
      const { data: requestsData, error: requestsError } = await supabase
        .from("workspace_join_requests")
        .select("*")
        .eq("admin_email", adminEmail)
        .in("status", ["pending", "email_sent", "approved"])
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch user info for each request using RPC function (bypasses RLS)
      const requestsWithProfiles = await Promise.all(
        (requestsData || []).map(async (request) => {
          if (!request.user_id) return { ...request, profiles: null };

          // Use RPC function to get user info (bypasses RLS)
          const { data: userInfo, error: userInfoError } = await supabase
            .rpc("get_join_request_user_info", { request_user_id: request.user_id });

          // If RPC fails, try direct query as fallback
          let profileData = null;
          if (userInfoError || !userInfo || userInfo.length === 0) {
            // Fallback to direct query (may fail due to RLS, but we try)
            const { data: fallbackData } = await supabase
              .from("profiles")
              .select("name, email, phone")
              .eq("id", request.user_id)
              .maybeSingle();
            profileData = fallbackData;
          } else {
            // RPC function returns array, get first result
            profileData = userInfo[0] || null;
          }

          return {
            ...request,
            profiles: profileData,
          };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load join requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && adminEmail) {
      fetchPendingRequests();
    }
  }, [open, adminEmail]);

  const handleApproveRequest = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    setActionLoading(requestId);
    try {
      // Use Edge Function to approve request (bypasses RLS)
      // The Edge Function uses service role key and can update any profile
      const { data, error } = await supabase.functions.invoke("approve-workspace-request", {
        body: { token: request.token },
      });

      if (error) {
        console.error("[JoinRequestsSidePanel] Approval error:", error);
        throw error;
      }

      console.log("[JoinRequestsSidePanel] Request approved successfully:", data);

      toast({
        title: "Request approved",
        description: "The user has been added to the company.",
      });

      // Refresh requests list
      fetchPendingRequests();
      
      // Update badge count in Dashboard
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    setActionLoading(requestId);
    try {     
      // Use Edge Function to reject request and send email (bypasses RLS)
      const { data, error } = await supabase.functions.invoke("reject-workspace-request", {
        body: { token: request.token },
        });

      if (error) {
        console.error("[JoinRequestsSidePanel] Rejection error:", error);
        throw error;
      }

      console.log("[JoinRequestsSidePanel] Request rejected successfully:", data);

      toast({
        title: "Request rejected",
        description: "The join request has been rejected and the user has been notified.",
      });

      // Refresh requests list
      fetchPendingRequests();
      
      // Update badge count in Dashboard
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Join Requests
            {requests.length > 0 && (
              <Badge variant="destructive">{requests.length}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No pending join requests
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {requests.map((request) => (
                <RequestItem
                  key={request.id}
                  request={request}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                  loading={actionLoading === request.id}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

