import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AnnotationWorkspace } from "@/components/annotation/AnnotationWorkspace";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/pages/EmptyState";
import { Lock } from "lucide-react";

export const AnnotationPage: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [searchParams] = useSearchParams();
  const initialImageFilename = searchParams.get("image") || undefined;
  const navigate = useNavigate();
  const { hasPermission, loading: profileLoading, userRole, error } = useProfile();
  const { toast } = useToast();

  // Check permission on mount
  useEffect(() => {
    // Still loading profile - don't decide permissions yet
    if (profileLoading) return;

    // If profile fetch hit a soft timeout, avoid auto-redirecting.
    // Let the user stay on the page while the app keeps existing state.
    if (
      error &&
      (error.includes("Profile fetch timeout after 8 seconds") ||
        error.includes("Profile fetch safety timeout after 10 seconds"))
    ) {
      return;
    }

    // If we don't have a resolved role yet, don't force-deny access.
    if (!userRole) return;

    if (!hasPermission("annotateDatasets")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to annotate datasets.",
        variant: "destructive",
      });
      navigate("/dashboard?view=simulation", { replace: true });
    }
  }, [hasPermission, profileLoading, userRole, error, navigate, toast]);

  if (!datasetId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Dataset ID is required.</p>
      </div>
    );
  }

  // Show loading or access denied if no permission
  if (profileLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!hasPermission("annotateDatasets")) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Access Denied"
          description="You don't have permission to annotate datasets. Please contact your workspace administrator."
        />
      </div>
    );
  }

  const handleClose = () => {
    // Navigate back to simulation page
    navigate("/dashboard?view=simulation");
  };

  return (
    <div className="p-4">
      <AnnotationWorkspace
        datasetId={datasetId}
        onClose={handleClose}
        initialImageFilename={initialImageFilename}
      />
    </div>
  );
};
