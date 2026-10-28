import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, matchPath } from "react-router-dom";
import { useEffect } from "react";
// Previous dark landing page — hidden for now (file kept). To bring it back,
// restore this import and use <Landing /> on the "/" route below.
// import Landing from "@/pages/Landing";
import LandingV2 from "@/pages/LandingV2";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import DatasetManager from "@/pages/DatasetManager";
import LearningCentrePage from "@/pages/LearningCentrePage";
import PlaygroundReportsPage from "@/pages/PlaygroundReportsPage";
import LabelPracticePage from "@/pages/LabelPracticePage";
import ProjectDatasetRoute from "@/pages/ProjectDatasetRoute";
import ResetPassword from "@/pages/ResetPassword";
import SetPasswordPage from "@/pages/SetPasswordPage";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/NotFound";
import { ContactPage, PrivacyPage, RefundsPage, TermsPage } from "@/pages/LegalPage";
import ShowcasePage from "@/pages/ShowcasePage";
import MainLayout from "@/layouts/MainLayout";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ColorThemeProvider } from "@/contexts/ColorThemeContext";
import { useProfile } from "@/hooks/useProfile";
import { LoadingState } from "@/components/pages/LoadingState";

// New pages
import { ProjectsPage } from "@/pages/ProjectsPage";
import { TeamMembersPage } from "@/pages/TeamMembersPage";
import { TeamInvitationsPage } from "@/pages/TeamInvitationsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import PredictionPage from "@/pages/PredictionPage";
import PredictionHistoryDetailsPage from "@/pages/PredictionHistoryDetailsPage";
import CorrosionDashboardPage from "@/pages/CorrosionDashboardPage";
import { AnnotationPage } from "@/pages/AnnotationPage";
import DemoExtinguisherOCRPage from "@/pages/DemoExtinguisherOCRPage";
import { AdminPage } from "@/pages/AdminPage";
// Route persistence is handled by useRoutePersistence hook in AppShell

// Addresses served by ProtectedRoutes (keep in step with the <Route>s below). Anything else is a
// 404 for everyone - signed-out visitors see "Page not found" instead of the sign-in page.
const APP_PATHS = [
  "/set-password",
  "/dashboard",
  "/dashboard/projects",
  "/project/prediction",
  "/project/prediction/history/:inferenceId",
  "/project/corrosion-dashboard",
  "/annotation/:datasetId",
  "/demo/extinguisher-ocr",
  "/dashboard/team",
  "/dashboard/team/members",
  "/dashboard/team/invitations",
  "/dashboard/settings",
  "/dashboard/settings/:section",
  "/account",
  "/account/profile",
  "/account/security",
  "/account/preferences",
  "/admin",
  "/learn",
  "/reports",
  "/practice/:sampleId",
  "/datasets",
  "/dataset/:id",
];
const isAppPath = (pathname: string) => APP_PATHS.some((pattern) => matchPath(pattern, pathname));

// Protected routes component - gates routes behind authentication
const ProtectedRoutes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionReady, user, loading } = useProfile();

  const needsPasswordSet = (user?.user_metadata as Record<string, unknown>)?.needs_password_set === true;
  const isSetPasswordPage = location.pathname === "/set-password";
  const knownPath = isAppPath(location.pathname);

  // Redirect to auth if session is ready but no user
  useEffect(() => {
    if (sessionReady && !user && knownPath) {
      navigate("/auth", { replace: true });
    }
  }, [sessionReady, user, knownPath, navigate]);

  // If user must set password (invited, first sign-in), redirect to /set-password unless already there
  useEffect(() => {
    if (sessionReady && user && needsPasswordSet && !isSetPasswordPage) {
      navigate("/set-password", { replace: true });
    }
  }, [sessionReady, user, needsPasswordSet, isSetPasswordPage, navigate]);

  // Route persistence is now handled by useRoutePersistence hook in AppShell
  // No duplicate persistence logic needed here

  // Unknown address: "Page not found" straight away, signed in or not
  if (!knownPath) {
    return <NotFound />;
  }

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

        {/* Corrosion Dashboard */}
        <Route path="/project/corrosion-dashboard" element={<CorrosionDashboardPage />} />
        
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
        {/* Old addresses open the matching section */}
        <Route path="/dashboard/settings/workspace" element={<Navigate to="/dashboard/settings/company" replace />} />
        <Route path="/dashboard/settings/usage" element={<Navigate to="/dashboard/settings/billing" replace />} />
        <Route path="/dashboard/settings/:section" element={<SettingsPage />} />
        
        {/* Account */}
        <Route path="/account" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="/account/profile" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="/account/security" element={<Navigate to="/dashboard/settings/password" replace />} />
        <Route path="/account/preferences" element={<Navigate to="/dashboard/settings/appearance" replace />} />

        {/* Superadmin panel (GSN platform admin only) */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/learn" element={<LearningCentrePage />} />
        <Route path="/reports" element={<PlaygroundReportsPage />} />
        <Route path="/practice/:sampleId" element={<LabelPracticePage />} />

        {/* Dataset Manager - keep existing routes for backward compatibility */}
        <Route path="/datasets" element={<DatasetManager />} />
        <Route path="/dataset/:id" element={<ProjectDatasetRoute />} />
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
        <ColorThemeProvider>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<LandingV2 />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/showcase" element={<ShowcasePage />} />
          <Route path="/showcase/:categoryId" element={<ShowcasePage />} />
          <Route path="/showcase/:categoryId/:projectId" element={<ShowcasePage />} />

          {/* Protected app pages - all routes under /dashboard, /account, /dataset, etc. */}
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
        </ColorThemeProvider>
      </ProfileProvider>
    </BrowserRouter>
  );
}

export default App;
