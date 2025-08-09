
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, Calendar, CreditCard, Library, Menu, Edit } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import UserProfileDropdown from './UserProfileDropdown';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const dashboardMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Edit Profile",
    url: "/dashboard/profile",
    icon: Edit,
  },
  {
    title: "My Meetups",
    url: "/dashboard/meetups",
    icon: Calendar,
  },
  {
    title: "Subscription", 
    url: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    title: "Library",
    url: "/dashboard/library", 
    icon: Library,
  },
];

function DashboardSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-semibold text-primary">TrafficMENA</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">
                {location.pathname === '/dashboard' ? 'Welcome' : 
                 location.pathname === '/dashboard/profile' ? 'Edit Profile' :
                 location.pathname === '/dashboard/meetups' ? 'My Meetups' :
                 location.pathname === '/dashboard/subscription' ? 'Subscription' :
                 location.pathname === '/dashboard/library' ? 'Library' : 'Dashboard'}
              </h1>
            </div>
            <UserProfileDropdown />
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
