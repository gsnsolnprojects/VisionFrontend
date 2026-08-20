import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/pages/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShortcutKeysDialog } from "@/components/ShortcutKeysDialog";
import { User, Shield, Settings, Keyboard, ArrowRight } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [showShortcutKeysDialog, setShowShortcutKeysDialog] = useState(false);

  return (
    <div>
      <PageHeader
        title="Account Settings"
        description="Manage your account preferences and security"
      />

      <motion.div className="grid gap-4 md:grid-cols-2" variants={fadeInUpVariants} initial="hidden" animate="visible">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/account/profile")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Profile</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/account/security")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Security</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/account/preferences")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Preferences</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Customize your app experience and notifications
            </CardDescription>
          </CardHeader>
        </Card>

        {/* ✅ Shortcut Keys card — opens the customisation dialog */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowShortcutKeysDialog(true)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Shortcut Keys</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Customise annotation keyboard shortcuts (A, D, W, Ctrl+C, Ctrl+V)
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      <ShortcutKeysDialog
        open={showShortcutKeysDialog}
        onOpenChange={setShowShortcutKeysDialog}
      />
    </div>
  );
};
