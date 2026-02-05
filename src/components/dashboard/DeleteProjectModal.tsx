import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import {
  getProjectSummary,
  deleteProject,
  type ProjectSummaryResponse,
} from "@/lib/api/dashboard";

export interface DeleteProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  projectName: string;
  onDeleted?: () => void;
}

export function DeleteProjectModal({
  open,
  onOpenChange,
  companyName,
  projectName,
  onDeleted,
}: DeleteProjectModalProps) {
  const [summary, setSummary] = useState<ProjectSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch project summary when modal opens
  useEffect(() => {
    if (!open || !companyName.trim() || !projectName.trim()) {
      setSummary(null);
      setFetchError(null);
      setDeleteError(null);
      return;
    }
    let cancelled = false;
    setFetchError(null);
    setDeleteError(null);
    setSummary(null);
    setLoading(true);
    getProjectSummary(companyName.trim(), projectName.trim())
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setFetchError(err.message ?? "Failed to load project summary.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, companyName, projectName]);

  const handleDelete = async () => {
    if (!companyName.trim() || !projectName.trim()) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteProject(companyName.trim(), projectName.trim());
      await Promise.resolve(onDeleted?.());
      onOpenChange(false);
    } catch (err: any) {
      setDeleteError(err?.message ?? "Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  };

  const canConfirm = summary != null && !fetchError && !loading;
  const isBusy = loading || deleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project permanently?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {loading && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </p>
              )}
              {fetchError && (
                <p className="text-destructive">{fetchError}</p>
              )}
              {canConfirm && (
                <>
                  <p>This will permanently delete all of the following for this project:</p>
                  <p className="font-medium">
                    {summary.datasetsCount} dataset{summary.datasetsCount !== 1 ? "s" : ""},{" "}
                    {summary.modelsCount} model{summary.modelsCount !== 1 ? "s" : ""},{" "}
                    {summary.trainingJobsCount} training job{summary.trainingJobsCount !== 1 ? "s" : ""},{" "}
                    {summary.inferenceJobsCount} inference run{summary.inferenceJobsCount !== 1 ? "s" : ""}.
                  </p>
                  <p className="text-muted-foreground text-sm">This action cannot be undone.</p>
                </>
              )}
              {deleteError && (
                <p className="text-destructive">{deleteError}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canConfirm || isBusy}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete project
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
