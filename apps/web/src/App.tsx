import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Route-based code splitting — each page loads on demand
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const CockpitPage = lazy(() => import('@/pages/CockpitPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));
const BillingPage = lazy(() => import('@/pages/BillingPage'));
const PitchLensListPage = lazy(() => import('@/pages/PitchLensListPage'));
const PitchLensDetailPage = lazy(() => import('@/pages/PitchLensDetailPage'));
const PitchLensWizardPage = lazy(() => import('@/pages/PitchLensWizardPage'));
const PitchBriefListPage = lazy(() => import('@/pages/PitchBriefListPage'));
const PitchBriefDetailPage = lazy(() => import('@/pages/PitchBriefDetailPage'));
const PitchBriefWizardPage = lazy(() => import('@/pages/PitchBriefWizardPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const GalleryViewerPage = lazy(() => import('@/pages/GalleryViewerPage'));
const ApiKeysPage = lazy(() => import('@/pages/ApiKeysPage'));
const DocsPage = lazy(() => import('@/pages/DocsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const NewPresentationWizardPage = lazy(() => import('@/pages/NewPresentationWizardPage'));

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-orange-500" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/:id" element={<GalleryViewerPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes with app layout (sidebar + navbar) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/cockpit" element={<CockpitPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pitch-briefs" element={<PitchBriefListPage />} />
            <Route path="/pitch-briefs/new" element={<PitchBriefWizardPage />} />
            <Route path="/pitch-briefs/:id" element={<PitchBriefDetailPage />} />
            <Route path="/pitch-briefs/:id/edit" element={<PitchBriefWizardPage />} />
            <Route path="/pitch-lens" element={<PitchLensListPage />} />
            <Route path="/pitch-lens/new" element={<PitchLensWizardPage />} />
            <Route path="/pitch-lens/:id" element={<PitchLensDetailPage />} />
            <Route path="/pitch-lens/:id/edit" element={<PitchLensWizardPage />} />
            <Route path="/knowledge-base" element={<Navigate to="/pitch-briefs" replace />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/api-keys" element={<ApiKeysPage />} />
          </Route>

          {/* Protected onboarding route (full-width, no sidebar) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected new presentation wizard (full-width, no sidebar) */}
          <Route
            path="/presentations/new"
            element={
              <ProtectedRoute>
                <NewPresentationWizardPage />
              </ProtectedRoute>
            }
          />

          {/* Protected workspace route (full-width, no sidebar) */}
          <Route
            path="/workspace/:id?"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
