import { Calendar, Edit, Home, Library, LogOut, Menu, Shield, User } from 'lucide-react';
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
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

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
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML =
                    '<span class="text-sm font-bold text-primary-green">T</span>';
                }}
              />
            </Link>
            <h2 className="text-lg font-semibold text-primary">TrafficMENA</h2>
          </div>
          <Badge variant="default" className="text-xs">
            Member
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Member Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardMenuItems.map((item) => {
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

        {/* Member Information */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary-green" />
                <div>
                  <p className="font-medium text-foreground">Member Access</p>
                  <p className="mt-1 text-muted-foreground">
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
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
            </div>
            <UserProfileDropdown />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
