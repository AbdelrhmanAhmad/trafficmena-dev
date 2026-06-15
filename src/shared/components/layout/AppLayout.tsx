import {
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  Crown,
  Edit,
  FileStack,
  GraduationCap,
  Home,
  Library,
  Mail,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import { PhoneCompletionBanner } from '@/shared/components/PhoneCompletionBanner';
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
import { SeriesCartNavButton } from '@/features/series/components/SeriesCartNavButton';
import UserProfileDropdown from './UserProfileDropdown';

// Menu items for member dashboard
const memberMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Edit Profile',
    url: '/dashboard/profile',
    icon: Edit,
  },
  {
    title: 'Events & Tracks',
    url: '/dashboard/meetups',
    icon: Calendar,
  },
  {
    title: 'Library',
    url: '/dashboard/library',
    icon: Library,
  },
  {
    title: 'Digital Products',
    url: '/dashboard/digital-products',
    icon: FileStack,
  },
  {
    title: 'Masterclasses',
    url: '/dashboard/masterclasses',
    icon: GraduationCap,
  },
  {
    title: 'Calculators',
    url: '/dashboard/calculators',
    icon: Calculator,
  },
];

// Menu items for admin/manager dashboard with role requirements
const adminMenuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: BarChart3,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'General Settings',
    url: '/admin/settings',
    icon: Settings,
    roles: ['owner', 'admin'] as UserRole[],
  },
  {
    title: 'User Management',
    url: '/admin/users',
    icon: Users,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'User Invitations',
    url: '/admin/invitations',
    icon: Mail,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'Promo Codes',
    url: '/admin/promo-codes',
    icon: Tag,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'Events & Tracks',
    url: '/admin/meetups',
    icon: Calendar,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'Content Library',
    url: '/admin/library',
    icon: BookOpen,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'Digital Products',
    url: '/admin/digital-products',
    icon: FileStack,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
  },
  {
    title: 'Masterclasses',
    url: '/admin/masterclasses',
    icon: GraduationCap,
    roles: ['owner', 'admin', 'manager'] as UserRole[],
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
  const { loading, rank, isOwner, isAdmin, isManager, canAccessSubscriptionPages } =
    useRolePermissions();
  const { data: subscription } = useCurrentSubscription({ enabled: !!user });
  const hasActiveSubscription = subscription?.status === 'active';

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
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                // Match exact path or sub-paths for sections like library and calculators
                const isActive =
                  location.pathname === item.url ||
                  (item.url !== '/dashboard' && location.pathname.startsWith(`${item.url}/`));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-10 rounded-lg px-3 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 data-[active=true]:bg-neutral-100 data-[active=true]:text-neutral-900"
                    >
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {variant === 'member' && <SeriesCartNavButton variant="sidebar" />}
              {variant === 'member' && canAccessSubscriptionPages && !hasActiveSubscription && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/dashboard/subscribe'}
                    className="h-10 rounded-lg border border-amber-200 bg-amber-50/50 px-3 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800 data-[active=true]:bg-amber-100 data-[active=true]:text-amber-800"
                  >
                    <Link to="/dashboard/subscribe" className="flex items-center gap-2.5">
                      <Crown className="h-4 w-4 shrink-0" />
                      <span className="truncate font-medium">Subscribe</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
        case '/dashboard/digital-products':
          return 'Digital Products';
        case '/dashboard/masterclasses':
          return 'Masterclasses';
        case '/series/cart':
          return 'Cart';
        case '/dashboard/calculators':
          return 'Marketing Calculators';
        default:
          if (location.pathname.startsWith('/dashboard/calculators/')) {
            return 'Calculator';
          }
          if (location.pathname.startsWith('/dashboard/digital-products/')) {
            return 'Digital Product';
          }
          if (location.pathname.startsWith('/dashboard/masterclasses/')) {
            return 'Masterclass';
          }
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
        <SidebarInset className="flex-1 theme-transition">
          <header className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-neutral-200/60 bg-white/90 backdrop-blur px-4 theme-transition">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold text-neutral-900">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-2">
              {variant === 'member' && <SeriesCartNavButton />}
              <UserProfileDropdown />
            </div>
          </header>
          {variant === 'member' && <PhoneCompletionBanner />}
          <main className="relative flex-1 overflow-x-hidden overflow-y-auto">
            <div className="pointer-events-none absolute -left-1/4 top-0 -z-10 h-[50vh] w-[60vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/50 via-[#f4fff9]/30 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-1/3 -z-10 h-[50vh] w-[50vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/20 via-[#05ef62]/15 to-transparent blur-[90px]" />
            <div className="relative p-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
