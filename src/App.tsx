import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MeetupDetail from '@/features/events/pages/EventDetail';
import Meetups from '@/features/events/pages/Meetups';
import PublicTrackDetail from '@/features/tracks/pages/TrackDetail';
import { usePageTracking } from '@/lib/analytics/usePageTracking';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { SignUpGuard } from '@/shared/components/layout/SignUpGuard';
import { SignUpProvider } from '@/shared/components/layout/SignUpLayout';
import { Toaster as Sonner } from '@/shared/components/ui/sonner';
import { Toaster } from '@/shared/components/ui/toaster';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { SeriesCartProvider } from '@/features/series/context/SeriesCartContext';
import { AuthProvider } from '@/shared/context/AuthContext';
import Index from './pages/Index';
import SignIn from './pages/SignIn';

function PageTracker() {
  usePageTracking();
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const AboutPage = lazy(() => import('./pages/About'));
const CommunityComingSoon = lazy(() => import('./pages/Community'));
const InviteOnlyPage = lazy(() => import('./pages/InviteOnly'));
const LibraryComingSoon = lazy(() => import('./pages/Library'));
const SubscribeLanding = lazy(() => import('./pages/SubscribeLanding'));
const ThankYou = lazy(() => import('./pages/ThankYou'));
const ThankYouEvent = lazy(() => import('./pages/ThankYouEvent'));
const ThankYouTrack = lazy(() => import('./pages/ThankYouTrack'));
const PrivacyPolicy = lazy(() => import('./pages/Privacy'));
const TermsOfService = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));
const InvitationAcceptancePage = lazy(() => import('./pages/invitation/[token]'));
const PublicCertificatePage = lazy(() => import('./pages/certificates/[code]'));

const PaymentSuccessPage = lazy(() => import('./pages/payment/success'));
const PaymentFailedPage = lazy(() => import('./pages/payment/failed'));
const PaymentPendingPage = lazy(() => import('./pages/payment/pending'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const WelcomeDashboard = lazy(() => import('./pages/WelcomeDashboard'));
const DashboardMeetups = lazy(() => import('@/features/events/pages/DashboardMeetups'));
const DashboardLibrary = lazy(() => import('./pages/DashboardLibrary'));
const DashboardTrackDetail = lazy(() => import('./pages/DashboardTrackDetail'));
const DashboardSeriesDetail = lazy(() => import('./pages/DashboardSeriesDetail'));
const SeriesStoreDetailPage = lazy(() => import('./pages/SeriesStoreDetail'));
const SeriesCartPage = lazy(() => import('./pages/SeriesCart'));
const DigitalProductsPage = lazy(() => import('./pages/dashboard/DigitalProducts'));
const DigitalProductDetailPage = lazy(() => import('./pages/dashboard/DigitalProductDetail'));
const MyOrdersPage = lazy(() => import('./pages/dashboard/MyOrders'));
const MasterclassesPage = lazy(() => import('./pages/dashboard/Masterclasses'));
const MasterclassDetailPage = lazy(() => import('./pages/dashboard/MasterclassDetail'));
const MasterclassLearnPage = lazy(() => import('./pages/dashboard/MasterclassLearn'));
const MasterclassLessonPage = lazy(() => import('./pages/dashboard/MasterclassLesson'));
const DashboardSubscribePage = lazy(() => import('./pages/dashboard/Subscribe'));
const LibraryItemDetail = lazy(() => import('./pages/LibraryItemDetail'));

const CalculatorsIndex = lazy(() => import('@/features/calculators/pages/CalculatorsIndex'));
const CalculatorDetail = lazy(() => import('@/features/calculators/pages/CalculatorDetail'));

const AdminDashboard = lazy(() => import('./pages/admin/index'));
const AdminSettingsPage = lazy(() => import('./pages/admin/settings'));
const UserManagement = lazy(() => import('./pages/admin/users'));
const AdminInvitations = lazy(() => import('./pages/admin/invitations'));
const AdminPromoCodes = lazy(() => import('./pages/admin/promo-codes'));
const AdminOrdersPage = lazy(() => import('./pages/admin/orders'));
const LibraryManagement = lazy(() => import('./pages/admin/library'));
const AdminLibraryItemDetail = lazy(() => import('./pages/admin/library/[id]'));
const NewLibraryItem = lazy(() => import('./pages/admin/library/new-item'));
const EditLibraryItem = lazy(() => import('./pages/admin/library/edit-item'));
const NewTrackPage = lazy(() => import('./pages/admin/library/tracks/new'));
const TrackDetailPage = lazy(() => import('./pages/admin/library/tracks/[id]'));
const NewSeriesPage = lazy(() => import('./pages/admin/library/series/new'));
const SeriesDetailPage = lazy(() => import('./pages/admin/library/series/[id]'));
const AdminDigitalProductsPage = lazy(() => import('./pages/admin/digital-products/index'));
const AdminNewDigitalProductPage = lazy(() => import('./pages/admin/digital-products/new'));
const AdminDigitalProductDetailPage = lazy(() => import('./pages/admin/digital-products/[id]'));
const AdminMasterclassesPage = lazy(() => import('./pages/admin/masterclasses/index'));
const AdminNewMasterclassPage = lazy(() => import('./pages/admin/masterclasses/new'));
const AdminMasterclassDetailPage = lazy(() => import('./pages/admin/masterclasses/[id]'));
const AdminCertificateSettingsPage = lazy(() => import('./pages/admin/certificate-settings'));

const AdminMeetups = lazy(() => import('@/features/events/pages/AdminMeetups'));
const AdminMeetupsNew = lazy(() => import('@/features/events/pages/admin/new'));
const EditMeetup = lazy(() => import('@/features/events/pages/admin/edit'));
const AdminEventDetail = lazy(() => import('@/features/events/pages/AdminEventDetail'));
const AdminTrackDetail = lazy(() => import('@/features/tracks/pages/AdminTrackDetail'));

const Step0 = lazy(() => import('./pages/signup/Step0'));
const Step1 = lazy(() => import('./pages/signup/Step1'));
const Step2 = lazy(() => import('./pages/signup/Step2'));
const Step3 = lazy(() => import('./pages/signup/Step3'));
const Step4 = lazy(() => import('./pages/signup/Step4'));
const Step5 = lazy(() => import('./pages/signup/Step5'));
const CheckEmail = lazy(() => import('./pages/signup/CheckEmail'));

const routeFallback = (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

const App = () => {
  // App initialization
  useEffect(() => {
    // App startup logic here if needed
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log sanitized error information for security monitoring
        console.error('Application error:', {
          message: error?.message || 'Unknown error',
          timestamp: new Date().toISOString(),
          componentStack: errorInfo?.componentStack?.split('\n')[0] || 'Unknown component',
        });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <SeriesCartProvider>
              <PageTracker />
              <Suspense fallback={routeFallback}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary>
                        <Index />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/about"
                    element={
                      <ErrorBoundary>
                        <AboutPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/library"
                    element={
                      <ErrorBoundary>
                        <LibraryComingSoon />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/community"
                    element={
                      <ErrorBoundary>
                        <CommunityComingSoon />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/invite-only"
                    element={
                      <ErrorBoundary>
                        <InviteOnlyPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/signin"
                    element={
                      <ErrorBoundary>
                        <SignIn />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <WelcomeDashboard />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/profile"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <Dashboard />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/edit"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <Dashboard />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/meetups"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <DashboardMeetups />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/library"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <DashboardLibrary />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/library/:id"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <LibraryItemDetail />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/library/tracks/:id"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <DashboardTrackDetail />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/library/series/:id"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <DashboardSeriesDetail />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/digital-products"
                    element={
                      <ErrorBoundary>
                        <DigitalProductsPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard/digital-products/:id"
                    element={
                      <ErrorBoundary>
                        <DigitalProductDetailPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard/orders"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <MyOrdersPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/masterclasses"
                    element={
                      <ErrorBoundary>
                        <MasterclassesPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard/masterclasses/:id/learn"
                    element={
                      <ErrorBoundary>
                        <MasterclassLearnPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard/masterclasses/lessons/:lessonId"
                    element={
                      <ErrorBoundary>
                        <MasterclassLessonPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard/masterclasses/:id"
                    element={
                      <ErrorBoundary>
                        <MasterclassDetailPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard/calculators"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <CalculatorsIndex />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/calculators/:slug"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <CalculatorDetail />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/subscribe"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin']}>
                        <ErrorBoundary>
                          <DashboardSubscribePage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/meetups"
                    element={
                      <ErrorBoundary>
                        <Meetups />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/meetups/:id"
                    element={
                      <ErrorBoundary>
                        <MeetupDetail />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/tracks/:id"
                    element={
                      <ErrorBoundary>
                        <PublicTrackDetail />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/series/cart"
                    element={
                      <ErrorBoundary>
                        <SeriesCartPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/series/:id"
                    element={
                      <ErrorBoundary>
                        <SeriesStoreDetailPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/payment/success"
                    element={
                      <ErrorBoundary>
                        <PaymentSuccessPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/payment/failed"
                    element={
                      <ErrorBoundary>
                        <PaymentFailedPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/payment/pending"
                    element={
                      <ErrorBoundary>
                        <PaymentPendingPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/subscribe"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin']} redirectPath="/">
                        <ErrorBoundary>
                          <SubscribeLanding />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/thank-you"
                    element={
                      <ErrorBoundary>
                        <ThankYou />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/thank-you-event/:id"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <ThankYouEvent />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/thank-you-track/:id"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <ThankYouTrack />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminDashboard />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <AdminProtectedRoute>
                        <ErrorBoundary>
                          <AdminSettingsPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/certificate-settings"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin']}>
                        <ErrorBoundary>
                          <AdminCertificateSettingsPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <UserManagement />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <LibraryManagement />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/new-item"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <NewLibraryItem />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/edit/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <EditLibraryItem />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminLibraryItemDetail />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/tracks/new"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <NewTrackPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/tracks/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <TrackDetailPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/series/new"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <NewSeriesPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/library/series/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <SeriesDetailPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/digital-products"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminDigitalProductsPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/digital-products/new"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminNewDigitalProductPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/digital-products/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminDigitalProductDetailPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/masterclasses"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminMasterclassesPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/masterclasses/new"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminNewMasterclassPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/masterclasses/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminMasterclassDetailPage />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/meetups"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminMeetups />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/meetups/new"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminMeetupsNew />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/meetups/edit/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <EditMeetup />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/events/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminEventDetail />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/tracks/:id"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminTrackDetail />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/invitations"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminInvitations />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/promo-codes"
                    element={
                      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                        <ErrorBoundary>
                          <AdminPromoCodes />
                        </ErrorBoundary>
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <ErrorBoundary>
                        <AdminOrdersPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/invitation/:token"
                    element={
                      <ErrorBoundary>
                        <InvitationAcceptancePage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/certificates/:code"
                    element={
                      <ErrorBoundary>
                        <PublicCertificatePage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/signup/*"
                    element={
                      <ErrorBoundary>
                        <SignUpGuard>
                          <SignUpProvider>
                            <Routes>
                              <Route index element={<Step0 />} />
                              <Route path="step-1" element={<Step1 />} />
                              <Route path="step-2" element={<Step2 />} />
                              <Route path="step-3" element={<Step3 />} />
                              <Route path="step-4" element={<Step4 />} />
                              <Route path="step-5" element={<Step5 />} />
                              <Route path="check-email" element={<CheckEmail />} />
                            </Routes>
                          </SignUpProvider>
                        </SignUpGuard>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/privacy"
                    element={
                      <ErrorBoundary>
                        <PrivacyPolicy />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/terms"
                    element={
                      <ErrorBoundary>
                        <TermsOfService />
                      </ErrorBoundary>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route
                    path="*"
                    element={
                      <ErrorBoundary>
                        <NotFound />
                      </ErrorBoundary>
                    }
                  />
                </Routes>
              </Suspense>
              </SeriesCartProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
