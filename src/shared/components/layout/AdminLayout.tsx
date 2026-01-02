import { BarChart3, BookOpen, Calendar, Mail, Settings, Shield, Users } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
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
import {
  getRolePriority,
  type UserRole,
  useRolePermissions,
} from '@/shared/hooks/custom/useRolePermissions';
import UserProfileDropdown from './UserProfileDropdown';

const adminMenuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: BarChart3,
    roles: ['owner', 'admin', 'manager'],
    description: 'Analytics & overview',
  },
  {
    title: 'General Settings',
    url: '/admin/settings',
    icon: Settings,
    roles: ['owner', 'admin'],
    description: 'Control platform access',
  },
  {
    title: 'User Management',
    url: '/admin/users',
    icon: Users,
    roles: ['owner', 'admin'],
    description: 'Manage users & roles',
  },
  {
    title: 'User Invitations',
    url: '/admin/invitations',
    icon: Mail,
    roles: ['owner', 'admin'],
    description: 'Send & manage invitations',
  },
  {
    title: 'Events & Tracks',
    url: '/admin/meetups',
    icon: Calendar,
    roles: ['owner', 'admin', 'manager'],
    description: 'Events & workshops',
  },
  {
    title: 'Content Library',
    url: '/admin/library',
    icon: BookOpen,
    roles: ['owner', 'admin', 'manager'],
    description: 'Resources & assets',
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { loading, role, rank, isOwner, isAdmin, isManager } = useRolePermissions();

  const handleSignOut = async () => {
    await signOut();
  };

  const allowedMenuItems = useMemo(() => {
    return adminMenuItems.filter((item) => {
      const roles = item.roles as UserRole[];
      if (!roles.length) return false;
      const minRank = Math.min(...roles.map((allowed) => getRolePriority(allowed)));
      return rank >= minRank;
    });
  }, [rank]);

  const badgeLabel = loading
    ? 'Loading'
    : isOwner
      ? 'Owner'
      : isAdmin
        ? 'Admin'
        : isManager
          ? 'Manager'
          : 'Member';

  const badgeVariant = isOwner || isAdmin ? 'destructive' : 'default';

  const panelLabel = loading
    ? 'Loading...'
    : isOwner
      ? 'Owner Panel'
      : isAdmin
        ? 'Admin Panel'
        : isManager
          ? 'Manager Panel'
          : 'Member Area';

  const accessDescription = loading
    ? 'Checking role permissions...'
    : isOwner || isAdmin
      ? 'Complete control over all platform features'
      : isManager
        ? 'Event and content management privileges'
        : 'View-only access';

  return (
    <Sidebar className="bg-white border-r border-neutral-200 shadow-[2px_0_12px_-4px_rgba(0,0,0,0.08)]">
      <SidebarHeader className="p-4 bg-neutral-50/80">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 shadow-sm transition-all duration-300 hover:border-[#05ef62]/60 hover:shadow-md hover:scale-105"
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
            <h2 className="text-lg font-semibold text-neutral-900">TrafficMENA</h2>
          </div>
          {loading ? (
            <div className="h-5 w-12 animate-pulse rounded bg-neutral-100"></div>
          ) : (
            <Badge
              variant={badgeVariant}
              className="text-xs bg-white/70 border border-white/50 backdrop-blur"
            >
              {badgeLabel}
            </Badge>
          )}
        </div>
        <p className="text-sm text-neutral-600">{user?.email}</p>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-700">{panelLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allowedMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title} className="mb-2">
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className="hover:bg-neutral-100 rounded-xl transition-colors"
                    >
                      <Link to={item.url} className="flex items-center gap-3 py-3">
                        <Icon className="h-4 w-4 shrink-0 text-neutral-700" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-neutral-900">{item.title}</span>
                          <span className="text-xs text-neutral-500">{item.description}</span>
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
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-neutral-100"></div>
                  <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-100"></div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-lg bg-gradient-to-br from-[#05ef62] to-[#29cf9f] p-1">
                    <Shield className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{panelLabel}</p>
                    <p className="mt-1 text-neutral-600">{accessDescription}</p>
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
  const { loading, isOwner, isAdmin, isManager } = useRolePermissions();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-neutral-200/60 bg-white/90 backdrop-blur px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold text-neutral-900">
                {loading
                  ? 'Loading...'
                  : isOwner
                    ? 'Owner Panel'
                    : isAdmin
                      ? 'Admin Panel'
                      : isManager
                        ? 'Manager Panel'
                        : 'Dashboard'}
              </h1>
            </div>
            <UserProfileDropdown />
          </header>
          <main className="relative flex-1 overflow-x-hidden overflow-y-auto">
            <div className="pointer-events-none absolute -left-1/4 top-0 -z-10 h-[50vh] w-[60vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/50 via-[#f4fff9]/30 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-1/3 -z-10 h-[50vh] w-[50vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/20 via-[#05ef62]/15 to-transparent blur-[140px]" />
            <div className="relative p-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
