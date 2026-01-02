import {
  BarChart3,
  BookOpen,
  Calendar,
  Edit,
  Home,
  Library,
  Mail,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

// Menu items for member dashboard
const memberMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    description: 'Overview & welcome',
  },
  {
    title: 'Edit Profile',
    url: '/dashboard/profile',
    icon: Edit,
    description: 'Update your info',
  },
  {
    title: 'Events & Tracks',
    url: '/dashboard/meetups',
    icon: Calendar,
    description: 'Your events & bookings',
  },
  {
    title: 'Library',
    url: '/dashboard/library',
    icon: Library,
    description: 'Resources & content',
  },
];

// Menu items for admin/manager dashboard with role requirements
const adminMenuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: BarChart3,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
    description: 'Analytics & overview',
  },
  {
    title: 'General Settings',
    url: '/admin/settings',
    icon: Settings,
    roles: ['owner', 'admin'] as UserRole[],
    description: 'Control platform access',
  },
  {
    title: 'User Management',
    url: '/admin/users',
    icon: Users,
    roles: ['owner', 'admin'] as UserRole[],
    description: 'Manage users & roles',
  },
  {
    title: 'User Invitations',
    url: '/admin/invitations',
    icon: Mail,
    roles: ['owner', 'admin'] as UserRole[],
    description: 'Send & manage invitations',
  },
  {
    title: 'Events & Tracks',
    url: '/admin/meetups',
    icon: Calendar,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
    description: 'Events & workshops',
  },
  {
    title: 'Content Library',
    url: '/admin/library',
    icon: BookOpen,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
    description: 'Resources & assets',
  },
];

type AppLayoutVariant = 'member' | 'admin';

interface AppLayoutProps {
  variant: AppLayoutVariant;
  children: React.ReactNode;
}

// Unified sidebar component
function AppSidebar({ variant }: { variant: AppLayoutVariant }) {
  const location = useLocation();
  const { user } = useAuth();
  const { loading, rank, isOwner, isAdmin, isManager } = useRolePermissions();

  // Filter admin menu items based on user's role rank
  const filteredAdminMenuItems = useMemo(() => {
    return adminMenuItems.filter((item) => {
      const minRank = Math.min(...item.roles.map((r) => getRolePriority(r)));
      return rank >= minRank;
    });
  }, [rank]);

  // Select menu items based on variant
  const menuItems = variant === 'admin' ? filteredAdminMenuItems : memberMenuItems;

  // Role badge label - always show actual role
  const badgeLabel = loading
    ? 'Loading'
    : isOwner
      ? 'Owner'
      : isAdmin
        ? 'Admin'
        : isManager
          ? 'Manager'
          : 'Member';

  // Panel label for sidebar group
  const panelLabel =
    variant === 'admin'
      ? loading
        ? 'Loading...'
        : isOwner
          ? 'Owner Panel'
          : isAdmin
            ? 'Admin Panel'
            : isManager
              ? 'Manager Panel'
              : 'Dashboard'
      : 'Member Dashboard';

  // Access description for footer
  const accessDescription =
    variant === 'admin'
      ? loading
        ? 'Checking role permissions...'
        : isOwner || isAdmin
          ? 'Complete control over all platform features'
          : isManager
            ? 'Event and content management privileges'
            : 'View-only access'
      : 'Enjoy exclusive events, content, and community features';

  return (
    <Sidebar className="bg-white border-r border-neutral-200 shadow-[2px_0_12px_-4px_rgba(0,0,0,0.08)]">
      <SidebarHeader className="p-4 bg-neutral-50/80">
        <div className="mb-2 flex items-center gap-3">
          <Link
            to="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-sm transition-all duration-300 hover:border-[#05ef62]/60 hover:shadow-md hover:scale-105"
          >
            <img
              src="/favicon-96x96.png"
              alt="TrafficMENA Logo"
              className="h-6 w-6 rounded-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                const container = event.currentTarget.parentElement;
                if (container) {
                  container.innerHTML = '<span class="text-sm font-bold text-[#05ef62]">T</span>';
                }
              }}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-neutral-900">TrafficMENA</h2>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm">
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-[#101010]">
                <Sparkles className="h-2 w-2" />
              </span>
              {loading ? <span className="animate-pulse">...</span> : badgeLabel}
            </div>
          </div>
        </div>
        <p className="text-sm text-neutral-600 truncate">{user?.email}</p>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-700">{panelLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title} className="mb-2">
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className="hover:bg-neutral-100 rounded-xl transition-colors"
                    >
                      <Link to={item.url} className="flex items-center gap-3 py-3.5">
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

        {/* Role/Access Information Footer */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-lg bg-gradient-to-br from-[#05ef62] to-[#29cf9f] p-1">
                  <Shield className="h-2.5 w-2.5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    {variant === 'admin' ? panelLabel : 'Member Access'}
                  </p>
                  <p className="mt-1 text-neutral-600">{accessDescription}</p>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// Main AppLayout component
const AppLayout: React.FC<AppLayoutProps> = ({ variant, children }) => {
  const location = useLocation();
  const { loading, isOwner, isAdmin, isManager } = useRolePermissions();

  // Get page title based on current route
  const getPageTitle = () => {
    if (variant === 'member') {
      switch (location.pathname) {
        case '/dashboard':
          return 'Member Dashboard';
        case '/dashboard/profile':
          return 'Edit Profile';
        case '/dashboard/meetups':
          return 'Events & Tracks';
        case '/dashboard/library':
          return 'Library';
        default:
          return 'Dashboard';
      }
    }
    // Admin variant
    return loading
      ? 'Loading...'
      : isOwner
        ? 'Owner Panel'
        : isAdmin
          ? 'Admin Panel'
          : isManager
            ? 'Manager Panel'
            : 'Dashboard';
  };

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar variant={variant} />
        <SidebarInset className="flex-1">
          <header className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-neutral-200/60 bg-white/90 backdrop-blur px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold text-neutral-900">{getPageTitle()}</h1>
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

export default AppLayout;
