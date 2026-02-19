import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isUserAdmin } from "@/lib/utils/adminUtils";

interface JoinCompanyDialogProps {
  disabled?: boolean;
}

export const JoinCompanyDialog: React.FC<JoinCompanyDialogProps> = ({ disabled }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profileData.company_id)
          .maybeSingle();

        setProfile(profileData);
        setCompany(companyData);
      } else {
        setProfile(profileData);
      }
    };

    checkAdminStatus();
  }, []);

  const isAdmin = profile && company ? isUserAdmin(profile, company) : false;
  const hasCompany = !!profile?.company_id;

  // Hide button if user is admin or already has a company
  if (isAdmin || hasCompany) {
    return null;
  }

  const handleJoinCompany = () => {
    navigate("/dashboard?action=join-company");
  };

  return (
    <Button variant="outline" size="sm" disabled={disabled} onClick={handleJoinCompany}>
      Join Company
    </Button>
  );
};
