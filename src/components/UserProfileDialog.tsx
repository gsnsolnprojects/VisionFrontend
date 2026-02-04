import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { isUserAdmin } from "@/lib/utils/adminUtils";
import { FormFieldWrapper } from "@/components/FormFieldWrapper";
import { useFormValidation } from "@/hooks/useFormValidation";
import { userProfileSchema, type UserProfileFormData } from "@/lib/validations/authSchemas";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");

  const profileForm = useFormValidation({
    schema: userProfileSchema,
    initialValues: {
      name: "",
      phone: "",
      companyName: "",
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "No authenticated user found.",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      const userId = session.user.id;

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        toast({
          title: "Error",
          description: "Profile not found.",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      setProfile(profileData);
      // Set email
      setEmail(profileData.email || session.user.email || "");

      // Load company if exists
      if (profileData.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profileData.company_id)
          .maybeSingle();

        if (companyData) {
          setCompany(companyData);
          // Check if user is admin
          const adminStatus = isUserAdmin(profileData, companyData);
          setIsAdmin(adminStatus);
          
          // Set form values
          profileForm.setValue("name", profileData.name || session.user.user_metadata?.name || "");
          profileForm.setValue("phone", profileData.phone || session.user.user_metadata?.phone || "");
          profileForm.setValue("companyName", companyData.name || "");
        } else {
          // Set form values without company
          profileForm.setValue("name", profileData.name || session.user.user_metadata?.name || "");
          profileForm.setValue("phone", profileData.phone || session.user.user_metadata?.phone || "");
        }
      } else {
        // Set form values without company
        profileForm.setValue("name", profileData.name || session.user.user_metadata?.name || "");
        profileForm.setValue("phone", profileData.phone || session.user.user_metadata?.phone || "");
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, onOpenChange]);

  useEffect(() => {
    if (open) {
      loadProfile();
      setIsEditing(false);
    }
  }, [open, loadProfile]);

  const handleSave = async () => {
    if (!profile) return;

    if (!profileForm.validateForm()) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before saving profile.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const name = profileForm.values.name.trim();
      const phone = profileForm.values.phone.trim();

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name,
          phone,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      // Update company name if user is admin and company name changed
      if (isAdmin && company && profileForm.values.companyName) {
        const companyName = profileForm.values.companyName.trim();
        if (companyName !== company.name) {
          const { error: companyError } = await supabase
            .from("companies")
            .update({
              name: companyName,
            })
            .eq("id", company.id);

          if (companyError) throw companyError;
        }
      }

      toast({
        title: "Profile updated successfully",
        description: "Your profile has been updated successfully.",
      });

      setIsEditing(false);
      // Reload profile to get updated data
      await loadProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Profile update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            View and edit your profile information.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <FormFieldWrapper
              label="Name"
              name="name"
              type="text"
              value={profileForm.values.name}
              onChange={profileForm.handleChange("name")}
              onBlur={profileForm.handleBlur("name")}
              error={profileForm.getFieldError("name")}
              touched={profileForm.isFieldTouched("name")}
              placeholder="Enter your name"
              required
              disabled={!isEditing}
            />

            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <FormFieldWrapper
              label="Phone"
              name="phone"
              type="tel"
              value={profileForm.values.phone}
              onChange={profileForm.handleChange("phone")}
              onBlur={profileForm.handleBlur("phone")}
              error={profileForm.getFieldError("phone")}
              touched={profileForm.isFieldTouched("phone")}
              placeholder="Enter your phone number"
              required
              disabled={!isEditing}
            />

            {company && (
              <div>
                <Label htmlFor="profile-company">Company Name</Label>
                <Input
                  id="profile-company"
                  value={profileForm.values.companyName || ""}
                  onChange={(e) => profileForm.setValue("companyName", e.target.value)}
                  onBlur={(e) => {
                    profileForm.handleBlur("companyName")(e as React.FocusEvent<HTMLInputElement>);
                  }}
                  disabled={!isEditing || !isAdmin}
                  className={
                    (!isEditing || !isAdmin ? "bg-muted" : "") +
                    (profileForm.isFieldTouched("companyName") &&
                    profileForm.getFieldError("companyName")
                      ? " border-destructive"
                      : "")
                  }
                  placeholder="Enter company name"
                />
                {profileForm.isFieldTouched("companyName") &&
                  profileForm.getFieldError("companyName") && (
                    <p className="mt-1 text-xs text-destructive" role="alert">
                      {profileForm.getFieldError("companyName")}
                    </p>
                  )}
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Only company admins can change the company name
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading || saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading || saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setIsEditing(true)} disabled={loading}>
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

