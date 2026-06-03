import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// Public pages — lazy-loaded for code splitting
const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const RegisterPage = lazy(() => import('./components/RegisterPage'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const FeaturesPage = lazy(() => import('./components/FeaturesPage'));
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));

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

// Authenticated pages — lazy-loaded for code splitting
const Dashboard = lazy(() => import('./components/DashboardPage'));
const WhatsAppModule = lazy(() => import('./components/WhatsAppModule'));
const CRMPage = lazy(() => import('./components/CRMPage'));
const LeadGenerationPage = lazy(() => import('./components/LeadGenerationPage'));
const AppointmentsPage = lazy(() => import('./components/AppointmentsPage'));
const ECommercePage = lazy(() => import('./components/ECommercePage'));
const PublicStorefront = lazy(() => import('./components/PublicStorefront'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('./components/OrderTrackingPage'));
const StoreSharePage = lazy(() => import('./components/StoreSharePage'));
const SalesAnalyticsPage = lazy(() => import('./components/SalesAnalyticsPage'));
const CustomerAccountPage = lazy(() => import('./components/CustomerAccountPage'));
const BulkImportExport = lazy(() => import('./components/BulkImportExport'));
const ShippingSettings = lazy(() => import('./components/ShippingSettings'));
const DocumentsPage = lazy(() => import('./components/DocumentsPage'));
const SocialMediaPage = lazy(() => import('./components/SocialMediaPage'));
const GoogleBusinessPage = lazy(() => import('./components/GoogleBusinessPage'));
const AIChatbotPage = lazy(() => import('./components/AIChatbotPage'));
const VoiceCallPage = lazy(() => import('./components/VoiceCallPage'));
const DograhSettings = lazy(() => import('./components/DograhSettings'));
const CreativeGeneratorPage = lazy(() => import('./components/CreativeGeneratorPage'));
const AutomationPage = lazy(() => import('./components/AutomationPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const ReviewsPage = lazy(() => import('./components/ReviewsPage'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const ApiKeysPage = lazy(() => import('./components/ApiKeysPage'));
const AuditLogPage = lazy(() => import('./components/AuditLogPage'));
const TeamManagement = lazy(() => import('./components/TeamManagement'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard'));
const EmailLeadImporter = lazy(() => import('./components/EmailLeadImporter'));
const EmailMarketingPage = lazy(() => import('./components/EmailMarketingPage'));
const WorkflowBuilder = lazy(() => import('./components/WorkflowBuilder'));
const FunnelBuilder = lazy(() => import('./components/FunnelBuilder'));
const SurveyBuilder = lazy(() => import('./components/SurveyBuilder'));
const CourseBuilder = lazy(() => import('./components/CourseBuilder'));
const TriggerLinks = lazy(() => import('./components/TriggerLinks'));
const PaymentLinks = lazy(() => import('./components/PaymentLinks'));
const ClientPortal = lazy(() => import('./components/ClientPortal'));
const ConversationsPage = lazy(() => import('./components/ConversationsPage'));
const CustomFieldsBuilder = lazy(() => import('./components/CustomFieldsBuilder'));
const BlogManager = lazy(() => import('./components/BlogManager'));
const ReviewRequests = lazy(() => import('./components/ReviewRequests'));
const AgencyDashboard = lazy(() => import('./components/AgencyDashboard'));
const MissedCallSettings = lazy(() => import('./components/MissedCallSettings'));
const SnapshotManager = lazy(() => import('./components/SnapshotManager'));

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

  return <ErrorBoundary pageName={location.pathname}>{children}</ErrorBoundary>;
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
      <Suspense fallback={<PageSkeleton />}>
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
      </Suspense>
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
