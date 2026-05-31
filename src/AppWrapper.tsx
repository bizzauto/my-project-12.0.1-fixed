import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './lib/authStore';
import { MobileApp } from './lib/capacitor-app';
import PageSkeleton from './components/PageSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

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
            <AuthLayout>
              <Dashboard />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <WhatsAppModule />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <CRMPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <LeadGenerationPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AppointmentsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ecommerce"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ECommercePage />
            </AuthLayout>
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
          <AuthLayout>
            <StoreSharePage />
          </AuthLayout>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <AuthLayout>
            <SalesAnalyticsPage />
          </AuthLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-account" element={
        <ProtectedRoute>
          <CustomerAccountPage />
        </ProtectedRoute>
      } />
      <Route path="/bulk-import" element={
        <ProtectedRoute>
          <AuthLayout>
            <BulkImportExport />
          </AuthLayout>
        </ProtectedRoute>
      } />
      <Route path="/shipping-settings" element={
        <ProtectedRoute>
          <AuthLayout>
            <ShippingSettings />
          </AuthLayout>
        </ProtectedRoute>
      } />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <DocumentsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/social"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <SocialMediaPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/google-business"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <GoogleBusinessPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chatbot"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AIChatbotPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice-call"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <VoiceCallPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/creative"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <CreativeGeneratorPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/automation"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AutomationPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReportsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReportsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-import"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <BulkImportPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/import-leads"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <EmailLeadImporter />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReviewsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Email Marketing */}
      <Route
        path="/email-marketing"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <EmailMarketingPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Automation & AI */}
      <Route
        path="/workflows"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <WorkflowBuilder />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trigger-links"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <TriggerLinks />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Marketing */}
      <Route
        path="/surveys"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <SurveyBuilder />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blog"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <BlogManager />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-requests"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReviewRequests />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-links"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <PaymentLinks />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Growth */}
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <CourseBuilder />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/funnels"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <FunnelBuilder />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversations"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ConversationsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings */}
      <Route
        path="/custom-fields"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <CustomFieldsBuilder />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-portal"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ClientPortal />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agency"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AgencyDashboard />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missed-call-settings"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <MissedCallSettings />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dograh-settings"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <DograhSettings />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/snapshots"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <SnapshotManager />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings & Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <UserProfile />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <SettingsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <BillingPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <TeamManagement />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ApiKeysPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AuditLogPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ToastProvider>
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export { ProtectedRoute, SuperAdminRoute };

export default function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}
