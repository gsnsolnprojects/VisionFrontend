import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import DatasetManager from "@/pages/DatasetManager";
import ResetPassword from "@/pages/ResetPassword";
import SetPasswordPage from "@/pages/SetPasswordPage";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/NotFound";
import MainLayout from "@/layouts/MainLayout";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { useProfile } from "@/hooks/useProfile";
import { LoadingState } from "@/components/pages/LoadingState";

// New pages
import { ProjectsPage } from "@/pages/ProjectsPage";
import { TeamMembersPage } from "@/pages/TeamMembersPage";
import { TeamInvitationsPage } from "@/pages/TeamInvitationsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SettingsWorkspacePage } from "@/pages/SettingsWorkspacePage";
import { SettingsBillingPage } from "@/pages/SettingsBillingPage";
import { SettingsUsagePage } from "@/pages/SettingsUsagePage";
import { SettingsMobileInspectPage } from "@/pages/SettingsMobileInspectPage";
import { AccountPage } from "@/pages/AccountPage";
import { AccountProfilePage } from "@/pages/AccountProfilePage";
import { AccountSecurityPage } from "@/pages/AccountSecurityPage";
import { AccountPreferencesPage } from "@/pages/AccountPreferencesPage";
import PredictionPage from "@/pages/PredictionPage";
import PredictionHistoryDetailsPage from "@/pages/PredictionHistoryDetailsPage";
import { AnnotationPage } from "@/pages/AnnotationPage";
import DemoExtinguisherOCRPage from "@/pages/DemoExtinguisherOCRPage";
// Route persistence is handled by useRoutePersistence hook in AppShell

// Protected routes component - gates routes behind authentication
const ProtectedRoutes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionReady, user, loading } = useProfile();

  const needsPasswordSet = (user?.user_metadata as Record<string, unknown>)?.needs_password_set === true;
  const isSetPasswordPage = location.pathname === "/set-password";

  // Redirect to auth if session is ready but no user
  useEffect(() => {
    if (sessionReady && !user) {
      navigate("/auth", { replace: true });
    }
  }, [sessionReady, user, navigate]);

  // If user must set password (invited, first sign-in), redirect to /set-password unless already there
  useEffect(() => {
    if (sessionReady && user && needsPasswordSet && !isSetPasswordPage) {
      navigate("/set-password", { replace: true });
    }
  }, [sessionReady, user, needsPasswordSet, isSetPasswordPage, navigate]);

  // Route persistence is now handled by useRoutePersistence hook in AppShell
  // No duplicate persistence logic needed here

  // Show loading while session is being hydrated
  if (!sessionReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  // Don't render routes if no user (redirect will happen)
  if (sessionReady && !user) {
    return null;
  }

  // Render routes only when session is ready and user exists
  return (
    <Routes>
      {/* Set password (invited users, one-time) - no MainLayout */}
      <Route path="/set-password" element={<SetPasswordPage />} />

      {/* App pages with header/sidebar */}
      <Route element={<MainLayout />}>
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Projects */}
        <Route path="/dashboard/projects" element={<ProjectsPage />} />
        
        {/* Prediction */}
        <Route path="/project/prediction" element={<PredictionPage />} />
        <Route path="/project/prediction/history/:inferenceId" element={<PredictionHistoryDetailsPage />} />
        
        {/* Annotation */}
        <Route path="/annotation/:datasetId" element={<AnnotationPage />} />

        {/* Temporary demo pages */}
        <Route
          path="/demo/extinguisher-ocr"
          element={<DemoExtinguisherOCRPage />}
        />
        
        {/* Team */}
        <Route path="/dashboard/team" element={<TeamMembersPage />} />
        <Route path="/dashboard/team/members" element={<TeamMembersPage />} />
        <Route path="/dashboard/team/invitations" element={<TeamInvitationsPage />} />
        
        {/* Settings */}
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/settings/workspace" element={<SettingsWorkspacePage />} />
        <Route path="/dashboard/settings/billing" element={<SettingsBillingPage />} />
        <Route path="/dashboard/settings/usage" element={<SettingsUsagePage />} />
        <Route path="/dashboard/settings/mobile-inspect" element={<SettingsMobileInspectPage />} />
        
        {/* Account */}
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/profile" element={<AccountProfilePage />} />
        <Route path="/account/security" element={<AccountSecurityPage />} />
        <Route path="/account/preferences" element={<AccountPreferencesPage />} />
        
        {/* Dataset Manager - keep existing routes for backward compatibility */}
        <Route path="/datasets" element={<DatasetManager />} />
        <Route path="/dataset/:id" element={<DatasetManager />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected app pages - all routes under /dashboard, /account, /dataset, etc. */}
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </ProfileProvider>
    </BrowserRouter>
  );
}

export default App;
