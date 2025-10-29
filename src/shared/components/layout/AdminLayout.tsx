import { BarChart3, BookOpen, Calendar, Mail, Shield, Users } from 'lucide-react';
import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar';
import { useAuth } from '@/shared/context/AuthContext';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import { useIsManager } from '@/shared/hooks/custom/useIsManager';
import UserProfileDropdown from './UserProfileDropdown';

const adminMenuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: BarChart3,
    roles: ['admin', 'manager'],
    description: 'Analytics & overview',
  },
  {
    title: 'User Management',
    url: '/admin/users',
    icon: Users,
    roles: ['admin'],
    description: 'Manage users & roles',
  },
  {
    title: 'User Invitations',
    url: '/admin/invitations',
    icon: Mail,
    roles: ['admin'],
    description: 'Send & manage invitations',
  },
  {
    title: 'Events',
    url: '/admin/meetups',
    icon: Calendar,
    roles: ['admin', 'manager'],
    description: 'Events & workshops',
  },
  {
    title: 'Content Library',
    url: '/admin/library',
    icon: BookOpen,
    roles: ['admin', 'manager'],
    description: 'Resources & assets',
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isManager, loading: managerLoading } = useIsManager();

  const handleSignOut = async () => {
    await signOut();
  };

  // Wait for both role checks to complete to prevent flickering
  const isLoadingRoles = adminLoading || managerLoading;

  // Determine user role for filtering navigation
  const getCurrentRole = () => {
    if (isLoadingRoles) return 'user'; // Default while loading
    if (isAdmin) return 'admin';
    if (isManager) return 'manager';
    return 'user';
  };

  const currentRole = getCurrentRole();

  // Filter menu items based on user role
  const allowedMenuItems = adminMenuItems.filter((item) => item.roles.includes(currentRole));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-colors hover:border-primary-green hover:shadow-md"
            >
              <img
                src="/favicon-96x96.png"
                alt="TrafficMENA Logo"
                className="h-6 w-6 rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  const container = event.currentTarget.parentElement;
                  if (container) {
                    container.innerHTML =
                      '<span class="text-sm font-bold text-primary-green">T</span>';
                  }
                }}
              />
            </Link>
            <h2 className="text-lg font-semibold text-primary">TrafficMENA</h2>
          </div>
          {!isLoadingRoles && (
            <Badge variant={isAdmin ? 'destructive' : 'default'} className="text-xs">
              {isAdmin ? 'Admin' : 'Manager'}
            </Badge>
          )}
          {isLoadingRoles && <div className="h-5 w-12 animate-pulse rounded bg-gray-200"></div>}
        </div>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isLoadingRoles ? 'Loading...' : isAdmin ? 'Admin Panel' : 'Manager Panel'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allowedMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title} className="mb-2">
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} className="flex items-center gap-3 py-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Role Information */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              {isLoadingRoles ? (
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-gray-200"></div>
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary-green" />
                  <div>
                    <p className="font-medium text-foreground">
                      {isAdmin ? 'Full Access' : 'Manager Access'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {isAdmin
                        ? 'Complete control over all platform features'
                        : 'Event and content management privileges'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isManager, loading: managerLoading } = useIsManager();
  const { user } = useAuth();
  const isLoadingRoles = adminLoading || managerLoading;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">
                {isLoadingRoles ? 'Loading...' : isAdmin ? 'Admin Panel' : 'Manager Panel'}
              </h1>
            </div>
            <UserProfileDropdown />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
