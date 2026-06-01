import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './lib/authStore';
import { MobileApp } from './lib/capacitor-app';
import PageSkeleton from './components/PageSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import ThemeSelector from './components/ThemeSelector';
import NetworkStatus from './components/NetworkStatus';
import { UIModeProvider, useUIMode } from './contexts/UIModeContext';
import UIModeToggle from './components/UIModeToggle';
import PWAInstallBanner from './components/PWAInstallBanner';
import { lazy, Suspense } from 'react';
const ModernPage = lazy(() => import('./components/ModernPage'));

// Public pages
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import PricingPage from './components/PricingPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import FeaturesPage from './components/FeaturesPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import NotFoundPage from './components/NotFoundPage';

// Authenticated layout
import AuthLayout from './layouts/AuthLayout';

const AI_ROUTES = new Set([
  '/dashboard', '/whatsapp', '/crm', '/leads', '/appointments', '/ecommerce',
  '/social', '/google-business', '/ai-chatbot', '/voice-call', '/creative',
  '/automation', '/reports', '/analytics', '/reviews', '/email-marketing',
  '/workflows', '/trigger-links', '/surveys', '/blog', '/review-requests',
  '/payment-links', '/courses', '/funnels', '/conversations', '/custom-fields',
  '/client-portal', '/agency', '/missed-call-settings', '/dograh-settings',
  '/snapshots', '/bulk-import', '/import-leads', '/shipping-settings',
  '/documents', '/profile', '/settings', '/billing', '/team', '/api-keys',
  '/audit-log', '/store-share',
]);

const ModeAwareAuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useUIMode();
  const location = useLocation();
  if (mode === 'ai' && AI_ROUTES.has(location.pathname)) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <ModernPage />
      </Suspense>
    );
  }
  return <AuthLayout>{children}</AuthLayout>;
};

// Authenticated pages
import Dashboard from './components/DashboardPage';
import WhatsAppModule from './components/WhatsAppModule';
import CRMPage from './components/CRMPage';
import LeadGenerationPage from './components/LeadGenerationPage';
import AppointmentsPage from './components/AppointmentsPage';
import ECommercePage from './components/ECommercePage';
import PublicStorefront from './components/PublicStorefront';
import CheckoutPage from './components/CheckoutPage';
import OrderTrackingPage from './components/OrderTrackingPage';
import StoreSharePage from './components/StoreSharePage';
import SalesAnalyticsPage from './components/SalesAnalyticsPage';
import CustomerAccountPage from './components/CustomerAccountPage';
import BulkImportExport from './components/BulkImportExport';
import ShippingSettings from './components/ShippingSettings';
import DocumentsPage from './components/DocumentsPage';
import SocialMediaPage from './components/SocialMediaPage';
import GoogleBusinessPage from './components/GoogleBusinessPage';
import AIChatbotPage from './components/AIChatbotPage';
import VoiceCallPage from './components/VoiceCallPage';
import DograhSettings from './components/DograhSettings';
import CreativeGeneratorPage from './components/CreativeGeneratorPage';
import AutomationPage from './components/AutomationPage';
import ReportsPage from './components/ReportsPage';
import ReviewsPage from './components/ReviewsPage';
import BillingPage from './components/BillingPage';
import ApiKeysPage from './components/ApiKeysPage';
import AuditLogPage from './components/AuditLogPage';
import TeamManagement from './components/TeamManagement';
import UserProfile from './components/UserProfile';
import SettingsPage from './components/SettingsPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import OnboardingWizard from './components/OnboardingWizard';
import BulkImportPage from './components/BulkImportPage';
import EmailLeadImporter from './components/EmailLeadImporter';
import EmailMarketingPage from './components/EmailMarketingPage';
import WorkflowBuilder from './components/WorkflowBuilder';
import FunnelBuilder from './components/FunnelBuilder';
import SurveyBuilder from './components/SurveyBuilder';
import CourseBuilder from './components/CourseBuilder';
import TriggerLinks from './components/TriggerLinks';
import PaymentLinks from './components/PaymentLinks';
import ClientPortal from './components/ClientPortal';
import ConversationsPage from './components/ConversationsPage';
import CustomFieldsBuilder from './components/CustomFieldsBuilder';
import BlogManager from './components/BlogManager';
import ReviewRequests from './components/ReviewRequests';
import AgencyDashboard from './components/AgencyDashboard';
import MissedCallSettings from './components/MissedCallSettings';
import SnapshotManager from './components/SnapshotManager';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized, onboardingCompleted } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if onboarding is required (only redirect if not already on /onboarding)
  if (!onboardingCompleted && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Super Admin Route
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  if (!isInitialized) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    // Initialize mobile native features (status bar, splash screen, etc.)
    MobileApp.init();
  }, [initialize]);

  return (
    <ToastProvider>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/features" element={<FeaturesPage />} />

      {/* Onboarding */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      {/* Super Admin */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />

      {/* Authenticated Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <Dashboard />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <WhatsAppModule />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <CRMPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <LeadGenerationPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <AppointmentsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ecommerce"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ECommercePage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/store" element={<PublicStorefront />} />
      <Route path="/store/:businessId" element={<PublicStorefront />} />
      <Route path="/checkout" element={
        <ProtectedRoute>
          <CheckoutPage />
        </ProtectedRoute>
      } />
      <Route path="/order-tracking" element={
        <ProtectedRoute>
          <OrderTrackingPage />
        </ProtectedRoute>
      } />
      <Route path="/order-tracking/:orderNumber" element={
        <ProtectedRoute>
          <OrderTrackingPage />
        </ProtectedRoute>
      } />
      <Route path="/store-share" element={
        <ProtectedRoute>
          <ModeAwareAuthLayout>
            <StoreSharePage />
          </ModeAwareAuthLayout>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <ModeAwareAuthLayout>
            <SalesAnalyticsPage />
          </ModeAwareAuthLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-account" element={
        <ProtectedRoute>
          <CustomerAccountPage />
        </ProtectedRoute>
      } />
      <Route path="/bulk-import" element={
        <ProtectedRoute>
          <ModeAwareAuthLayout>
            <BulkImportExport />
          </ModeAwareAuthLayout>
        </ProtectedRoute>
      } />
      <Route path="/shipping-settings" element={
        <ProtectedRoute>
          <ModeAwareAuthLayout>
            <ShippingSettings />
          </ModeAwareAuthLayout>
        </ProtectedRoute>
      } />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <DocumentsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/social"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <SocialMediaPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/google-business"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <GoogleBusinessPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chatbot"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <AIChatbotPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice-call"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <VoiceCallPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/creative"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <CreativeGeneratorPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/automation"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <AutomationPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ReportsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ReportsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-import"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <BulkImportPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/import-leads"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <EmailLeadImporter />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ReviewsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Email Marketing */}
      <Route
        path="/email-marketing"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <EmailMarketingPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Automation & AI */}
      <Route
        path="/workflows"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <WorkflowBuilder />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trigger-links"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <TriggerLinks />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Marketing */}
      <Route
        path="/surveys"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <SurveyBuilder />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blog"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <BlogManager />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-requests"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ReviewRequests />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-links"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <PaymentLinks />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Growth */}
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <CourseBuilder />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/funnels"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <FunnelBuilder />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversations"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ConversationsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings */}
      <Route
        path="/custom-fields"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <CustomFieldsBuilder />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-portal"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ClientPortal />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agency"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <AgencyDashboard />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missed-call-settings"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <MissedCallSettings />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dograh-settings"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <DograhSettings />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/snapshots"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <SnapshotManager />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings & Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <UserProfile />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <SettingsPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <BillingPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <TeamManagement />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <ApiKeysPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <ModeAwareAuthLayout>
              <AuditLogPage />
            </ModeAwareAuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <NetworkStatus />
    <ThemeSelector />
    <UIModeToggle />
    <PWAInstallBanner />
    </ToastProvider>
  );
}

export { ProtectedRoute, SuperAdminRoute };

export default function AppWrapper() {
  return (
      <ErrorBoundary>
        <UIModeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </UIModeProvider>
      </ErrorBoundary>
  );
}
