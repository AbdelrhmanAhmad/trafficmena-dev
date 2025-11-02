import { Calendar, Edit, Home, Library, Shield, Sparkles } from 'lucide-react';
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
import UserProfileDropdown from './UserProfileDropdown';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const dashboardMenuItems = [
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
    title: 'My Events',
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

function DashboardSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar className="bg-white/95 backdrop-blur border-r border-neutral-200/40">
      <SidebarHeader className="p-4 bg-white/80 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-sm transition-all duration-300 hover:border-[#05ef62]/60 hover:shadow-md hover:scale-105"
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
                      '<span class="text-sm font-bold text-[#05ef62]">T</span>';
                  }
                }}
              />
            </Link>
            <h2 className="text-lg font-semibold text-neutral-900">TrafficMENA</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 backdrop-blur">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-[#101010]">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
            Member
          </div>
        </div>
        <p className="text-sm text-neutral-600">{user?.email}</p>
      </SidebarHeader>
      <SidebarContent className="bg-white/60 backdrop-blur">
        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-700">Member Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title} className="mb-2">
                    <SidebarMenuButton asChild isActive={location.pathname === item.url} className="hover:bg-white/40 rounded-xl">
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

        {/* Member Information */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur p-3 text-xs">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-lg bg-gradient-to-br from-[#05ef62] to-[#29cf9f] p-1">
                  <Shield className="h-2.5 w-2.5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Member Access</p>
                  <p className="mt-1 text-neutral-600">
                    Enjoy exclusive events, content, and community features
                  </p>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Member Dashboard';
      case '/dashboard/profile':
        return 'Edit Profile';
      case '/dashboard/meetups':
        return 'My Events';
      case '/dashboard/library':
        return 'Library';
      default:
        return 'Dashboard';
    }
  };

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        <DashboardSidebar />
        <SidebarInset className="flex-1">
          <header className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-neutral-200/60 bg-white/90 backdrop-blur px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold text-neutral-900">{getPageTitle()}</h1>
            </div>
            <UserProfileDropdown />
          </header>
          <main className="relative flex-1">
            <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[48vw] top-[35vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[140px]" />
            <div className="relative p-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
