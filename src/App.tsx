
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import WelcomeDashboard from "./pages/WelcomeDashboard";
import DashboardMeetups from "./pages/DashboardMeetups";
import DashboardSubscription from "./pages/DashboardSubscription";
import DashboardLibrary from "./pages/DashboardLibrary";
import Meetups from "./pages/Meetups";
import MeetupDetail from "./pages/meetups/MeetupDetail";
import Subscribe from "./pages/Subscribe";
import Products from "./pages/Products";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import { SignUpProvider } from "./components/SignUpLayout";
import Step0 from "./pages/signup/Step0";
import Step1 from "./pages/signup/Step1";
import Step2 from "./pages/signup/Step2";
import Step3 from "./pages/signup/Step3";
import Step4 from "./pages/signup/Step4";
import Step5 from "./pages/signup/Step5";
import CheckEmail from "./pages/signup/CheckEmail";
import AdminDashboard from "./pages/admin/index";
import UserManagement from "./pages/admin/users";
import LibraryManagement from "./pages/admin/library";
import NewLibraryItem from "./pages/admin/library/new-item";
import AdminMeetups from "./pages/admin/meetups";
import AdminMeetupsNew from "./pages/admin/meetups/new";
import EditMeetup from "./pages/admin/meetups/edit";
import AdminProducts from "./pages/admin/products";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary onError={() => {}/* Production: silently handle errors */}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <WelcomeDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/profile" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/profile/edit" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/meetups" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DashboardMeetups />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/subscription" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DashboardSubscription />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/library" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DashboardLibrary />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/meetups" element={
                <ErrorBoundary>
                  <Meetups />
                </ErrorBoundary>
              } />
              <Route path="/meetups/:id" element={
                <ErrorBoundary>
                  <MeetupDetail />
                </ErrorBoundary>
              } />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/products" element={
                <ErrorBoundary>
                  <Products />
                </ErrorBoundary>
              } />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <AdminDashboard />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <UserManagement />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/library" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <LibraryManagement />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/library/new-item" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <NewLibraryItem />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/library/edit/:id" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <NewLibraryItem />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/meetups" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <AdminMeetups />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/meetups/new" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <AdminMeetupsNew />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/meetups/edit/:id" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <EditMeetup />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/products" element={
                <AdminProtectedRoute>
                  <ErrorBoundary>
                    <AdminProducts />
                  </ErrorBoundary>
                </AdminProtectedRoute>
              } />
              <Route path="/signup/*" element={
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
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
