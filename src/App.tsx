import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminEventDetail from '@/features/events/pages/AdminEventDetail';
import AdminMeetups from '@/features/events/pages/AdminMeetups';
import EditMeetup from '@/features/events/pages/admin/edit';
import AdminMeetupsNew from '@/features/events/pages/admin/new';
import DashboardMeetups from '@/features/events/pages/DashboardMeetups';
import MeetupDetail from '@/features/events/pages/EventDetail';
import Meetups from '@/features/events/pages/Meetups';
import AdminTrackDetail from '@/features/tracks/pages/AdminTrackDetail';
import PublicTrackDetail from '@/features/tracks/pages/TrackDetail';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { SignUpGuard } from '@/shared/components/layout/SignUpGuard';
import { SignUpProvider } from '@/shared/components/layout/SignUpLayout';
import { Toaster as Sonner } from '@/shared/components/ui/sonner';
import { Toaster } from '@/shared/components/ui/toaster';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { AuthProvider } from '@/shared/context/AuthContext';
import AboutPage from './pages/About';
import AdminDashboard from './pages/admin/index';
import AdminInvitations from './pages/admin/invitations';
import LibraryManagement from './pages/admin/library';
import AdminLibraryItemDetail from './pages/admin/library/[id]';
import EditLibraryItem from './pages/admin/library/edit-item';
import NewLibraryItem from './pages/admin/library/new-item';
import SeriesDetailPage from './pages/admin/library/series/[id]';
import NewSeriesPage from './pages/admin/library/series/new';
import TrackDetailPage from './pages/admin/library/tracks/[id]';
import NewTrackPage from './pages/admin/library/tracks/new';
import AdminSettingsPage from './pages/admin/settings';
import UserManagement from './pages/admin/users';
import CommunityComingSoon from './pages/Community';
import Dashboard from './pages/Dashboard';
import DashboardLibrary from './pages/DashboardLibrary';
import DashboardSeriesDetail from './pages/DashboardSeriesDetail';
import DashboardTrackDetail from './pages/DashboardTrackDetail';
import DashboardSubscribePage from './pages/dashboard/Subscribe';
import Index from './pages/Index';
import InviteOnlyPage from './pages/InviteOnly';
import InvitationAcceptancePage from './pages/invitation/[token]';
import LibraryComingSoon from './pages/Library';
import LibraryItemDetail from './pages/LibraryItemDetail';
import NotFound from './pages/NotFound';
import PaymentFailedPage from './pages/payment/failed';
import PaymentPendingPage from './pages/payment/pending';
import PaymentSuccessPage from './pages/payment/success';
import SignIn from './pages/SignIn';
import SubscribeLanding from './pages/SubscribeLanding';
import CheckEmail from './pages/signup/CheckEmail';
import Step0 from './pages/signup/Step0';
import Step1 from './pages/signup/Step1';
import Step2 from './pages/signup/Step2';
import Step3 from './pages/signup/Step3';
import Step4 from './pages/signup/Step4';
import Step5 from './pages/signup/Step5';
import ThankYou from './pages/ThankYou';
import ThankYouEvent from './pages/ThankYouEvent';
import WelcomeDashboard from './pages/WelcomeDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // App initialization
  useEffect(() => {
    // App startup logic here if needed
    console.log('🚀 App.tsx mounted successfully!');
    console.log('📍 Current location:', window.location.href);
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
                  path="/dashboard/subscribe"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <DashboardSubscribePage />
                      </ErrorBoundary>
                    </ProtectedRoute>
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
                  path="/payment/success"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <PaymentSuccessPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment/failed"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <PaymentFailedPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment/pending"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <PaymentPendingPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscribe"
                  element={
                    <ErrorBoundary>
                      <SubscribeLanding />
                    </ErrorBoundary>
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
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
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
                  path="/admin/users"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <UserManagement />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <LibraryManagement />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/new-item"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <NewLibraryItem />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/edit/:id"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <EditLibraryItem />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/:id"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <AdminLibraryItemDetail />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/tracks/new"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <NewTrackPage />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/tracks/:id"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <TrackDetailPage />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/series/new"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <NewSeriesPage />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/library/series/:id"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <SeriesDetailPage />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/meetups"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <AdminMeetups />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/meetups/new"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <AdminMeetupsNew />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/meetups/edit/:id"
                  element={
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <EditMeetup />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/events/:id"
                  element={
                    <AdminProtectedRoute>
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
                    <AdminProtectedRoute>
                      <ErrorBoundary>
                        <AdminInvitations />
                      </ErrorBoundary>
                    </AdminProtectedRoute>
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
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
