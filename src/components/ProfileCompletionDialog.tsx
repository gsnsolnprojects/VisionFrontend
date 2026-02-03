// src/components/ProfileCompletionDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FormFieldWrapper } from "@/components/FormFieldWrapper";
import { useFormValidation } from "@/hooks/useFormValidation";
import {
  nameSchema,
  validatePhoneNumber,
  phoneRules,
} from "@/lib/validations/authSchemas";
import { z } from "zod";
import { Lock } from "lucide-react";

interface ProfileCompletionDialogProps {
  open: boolean;
  onComplete: () => void;
  userEmail: string;
  userId: string;
}

// Schema for profile completion form (name + phone)
const profileCompletionSchema = z.object({
  name: nameSchema,
  phone: z.string().min(1, "Phone number is required"),
});

export const ProfileCompletionDialog: React.FC<ProfileCompletionDialogProps> = ({
  open,
  onComplete,
  userEmail,
  userId,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const form = useFormValidation({
    schema: profileCompletionSchema,
    initialValues: {
      name: "",
      phone: "",
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Fetch and pre-fill existing profile data when dialog opens
  useEffect(() => {
    if (!open || !userId) return;

    const fetchProfileData = async () => {
      setFetchingProfile(true);
      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("name, phone")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        if (profileData) {
          // Pre-fill name if it exists
          if (profileData.name && profileData.name.trim()) {
            form.setValue("name", profileData.name);
          }

          // Pre-fill phone if it exists
          if (profileData.phone && profileData.phone.trim()) {
            // Extract country code from phone (format: +91XXXXXXXXXX)
            const phoneWithCode = profileData.phone.trim();
            
            // Try to match country code
            const codes = ["+971", "+966", "+960", "+86", "+852", "+853", "+886", "+90", "+92", "+93", "+94", "+95", "+1", "+44", "+91", "+61", "+49", "+33", "+81", "+82"];
            let foundCode = "+91"; // default
            let phoneNumber = phoneWithCode;

            for (const code of codes) {
              if (phoneWithCode.startsWith(code)) {
                foundCode = code;
                phoneNumber = phoneWithCode.substring(code.length);
                break;
              }
            }

            setCountryCode(foundCode);
            form.setValue("phone", phoneNumber);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setFetchingProfile(false);
      }
    };

    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  // Validate phone number when it changes
  useEffect(() => {
    if (form.values.phone && countryCode) {
      const error = validatePhoneNumber(form.values.phone, countryCode);
      setPhoneError(error);
    } else {
      setPhoneError(null);
    }
  }, [form.values.phone, countryCode]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    form.validateForm();

    // Validate phone with country code
    const currentPhoneError = validatePhoneNumber(form.values.phone, countryCode);
    setPhoneError(currentPhoneError);

    // Check if form is valid
    const hasFormErrors = !form.isValid || !!currentPhoneError;
    const hasAllFields = form.values.name && form.values.phone;

    if (hasFormErrors || !hasAllFields) {
      toast({
        title: "Please check your details",
        description: "Fix the highlighted errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const fullPhone = countryCode + form.values.phone;
      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.values.name.trim(),
          phone: fullPhone,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been completed successfully.",
      });

      onComplete();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* Prevent closing */}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide the close button by not rendering it
        // The dialog can only be closed by completing the profile
      >
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide your details to continue using VisionM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <FormFieldWrapper
            label="Full Name"
            name="name"
            value={form.values.name}
            onChange={form.handleChange("name")}
            onBlur={form.handleBlur("name")}
            error={form.getFieldError("name")}
            touched={form.isFieldTouched("name")}
            placeholder="Enter your full name"
            required
          />

          <div>
            <Label htmlFor="phone">
              Phone Number
              <span className="text-destructive ml-1">*</span>
            </Label>
            <div className="flex gap-2 mt-1">
              <Select
                value={countryCode}
                onValueChange={(value) => setCountryCode(value)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+1">US +1</SelectItem>
                  <SelectItem value="+44">UK +44</SelectItem>
                  <SelectItem value="+91">IN +91</SelectItem>
                  <SelectItem value="+61">AU +61</SelectItem>
                  <SelectItem value="+49">DE +49</SelectItem>
                  <SelectItem value="+33">FR +33</SelectItem>
                  <SelectItem value="+86">CN +86</SelectItem>
                  <SelectItem value="+81">JP +81</SelectItem>
                  <SelectItem value="+971">UAE +971</SelectItem>
                  <SelectItem value="+966">SA +966</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                value={form.values.phone}
                onChange={form.handleChange("phone")}
                onBlur={form.handleBlur("phone")}
                placeholder={`${phoneRules[countryCode]?.length || 10} digits`}
                className={
                  form.isFieldTouched("phone") && (form.getFieldError("phone") || phoneError)
                    ? "border-destructive flex-1"
                    : "flex-1"
                }
              />
            </div>
            {form.isFieldTouched("phone") && (form.getFieldError("phone") || phoneError) && (
              <p className="mt-1 text-xs text-destructive">
                {form.getFieldError("phone") || phoneError}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">
              Email
              <Lock className="inline-block w-3 h-3 ml-2 text-muted-foreground" />
            </Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              disabled
              className="mt-1 bg-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This email was used for your invitation and cannot be changed.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionDialog;

