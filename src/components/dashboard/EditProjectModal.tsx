import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFormValidation } from "@/hooks/useFormValidation";
import { projectSchema } from "@/lib/validations/authSchemas";
import { useToast } from "@/hooks/use-toast";
import { renameProjectCascade } from "@/lib/api/projects";

export interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string; description?: string | null } | null;
  /** Needed to cascade-rename the project's linked data in MongoDB when the name changes. */
  companyName: string;
  onSaved?: () => void;
}

export function EditProjectModal({
  open,
  onOpenChange,
  project,
  companyName,
  onSaved,
}: EditProjectModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  // Set only when the Supabase rename succeeded but relinking the project's
  // MongoDB data (surveys, actions, models...) under the new name failed —
  // the dialog stays open and blocks on this instead of closing silently,
  // since leaving it means the dashboard shows no data under the new name.
  const [cascadeError, setCascadeError] = useState<{ old: string; new: string; message: string } | null>(null);

  const form = useFormValidation({
    schema: projectSchema,
    initialValues: {
      projectName: "",
      projectDescription: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // Reset form when modal opens with project data
  useEffect(() => {
    if (open && project) {
      setCascadeError(null);
      form.setValue("projectName", project.name);
      form.setValue("projectDescription", project.description ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id, project?.name, project?.description]);

  const handleSave = async () => {
    if (!project?.id || !form.validateForm()) {
      if (!form.validateForm()) {
        toast({
          title: "Please check your details",
          description: "Fix the highlighted errors before saving.",
          variant: "destructive",
        });
      }
      return;
    }

    setSaving(true);
    try {
      const trimmedName = form.values.projectName.trim();
      const nameChanged = trimmedName !== project.name;

      const { error } = await supabase
        .from("projects")
        .update({
          name: trimmedName,
          description: (form.values.projectDescription || "").trim() || null,
        })
        .eq("id", project.id);

      if (error) throw error;

      // The project's actual inspection data (surveys, photos, actions,
      // trained models) lives in MongoDB, matched by name — keep it linked.
      if (nameChanged && companyName) {
        try {
          await renameProjectCascade(companyName, project.name, trimmedName);
        } catch (cascadeErr: any) {
          // The name is already changed in Supabase at this point — leaving the
          // dialog here (instead of closing it) is what stops this from being a
          // silent, easy-to-miss data split between the two names.
          setCascadeError({
            old: project.name,
            new: trimmedName,
            message: cascadeErr?.message || "Could not reach the server.",
          });
          await Promise.resolve(onSaved?.());
          return;
        }
      }

      toast({
        title: "Project updated",
        description: "Project details have been saved successfully.",
      });
      onOpenChange(false);
      await Promise.resolve(onSaved?.());
    } catch (err: any) {
      console.error("Error updating project:", err);
      toast({
        title: "Update failed",
        description: err.message ?? "Failed to update project.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const retryCascade = async () => {
    if (!cascadeError || !companyName) return;
    setSaving(true);
    try {
      await renameProjectCascade(companyName, cascadeError.old, cascadeError.new);
      setCascadeError(null);
      toast({
        title: "Project updated",
        description: "Historical data has been relinked to the new name.",
      });
      onOpenChange(false);
      await Promise.resolve(onSaved?.());
    } catch (err: any) {
      setCascadeError({ ...cascadeError, message: err?.message || "Could not reach the server." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update the project name and description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-project-name">Project name</Label>
            <Input
              id="edit-project-name"
              value={form.values.projectName}
              onChange={(e) => form.setValue("projectName", e.target.value)}
              onBlur={(e) => form.handleBlur("projectName")(e as React.FocusEvent<HTMLInputElement>)}
              placeholder="Enter project name"
              className="mt-1"
            />
            {form.isFieldTouched("projectName") && form.getFieldError("projectName") && (
              <p className="mt-1 text-xs text-destructive">{form.getFieldError("projectName")}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-project-description">Description (optional)</Label>
            <Textarea
              id="edit-project-description"
              value={form.values.projectDescription ?? ""}
              onChange={(e) => form.setValue("projectDescription", e.target.value)}
              placeholder="Enter project description"
              className="mt-1"
              rows={3}
            />
            {form.isFieldTouched("projectDescription") && form.getFieldError("projectDescription") && (
              <p className="mt-1 text-xs text-destructive">{form.getFieldError("projectDescription")}</p>
            )}
          </div>
          {cascadeError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">
                Renamed to "{cascadeError.new}", but its data is still linked under "{cascadeError.old}"
              </p>
              <p className="mt-1 text-muted-foreground">
                {cascadeError.message} Your surveys, photos and actions won't show up until this is retried
                — don't close this dialog until it succeeds.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          {cascadeError ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Close anyway
              </Button>
              <Button onClick={retryCascade} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  "Retry"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
