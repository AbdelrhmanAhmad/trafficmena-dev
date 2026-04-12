import { Crown, LayoutDashboard, Library, LogOut, Settings, Shield } from 'lucide-react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAuth } from '@/shared/context/AuthContext';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { getAdminDashboardPath } from '@/shared/utils/adminAccess';

const UserProfileDropdown: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { canAccessAdmin, canAccessSubscriptionPages, isOwner, isAdmin, isManager, role } =
    useRolePermissions();
  const { data: currentUser } = useCurrentUser();
  const { data: subscription } = useCurrentSubscription({ enabled: !!user });
  const profile = currentUser?.profile;

  const hasActiveSubscription = subscription?.status === 'active';
  const showSubscriptionEntry = canAccessSubscriptionPages && !hasActiveSubscription;

  const handleSignOut = async () => {
    try {
      const result = await signOut();

      if (result.error) {
        // Show user feedback for sign out errors
        console.error('Sign out error:', result.error);
        // You could add a toast notification here if available
      }

      // Always navigate away regardless of error (local state is cleaned up)
      navigate('/');
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Force navigation even on unexpected errors
      navigate('/');
    }
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || 'User';
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center space-x-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-primary"
        >
          <Avatar className="h-8 w-8 ring-2 ring-primary-white/20 transition-all hover:ring-primary-green">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={getDisplayName()} />
            <AvatarFallback className="bg-gradient-to-br from-primary-green to-secondary-teal text-sm font-semibold text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="z-50 w-72 border border-border bg-card shadow-lg"
        align="end"
        forceMount
      >
        <div className="flex items-center space-x-3 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={getDisplayName()} />
            <AvatarFallback className="bg-gradient-to-br from-primary-green to-secondary-teal text-sm font-semibold text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col space-y-1">
            <p className="truncate text-sm font-medium">{getDisplayName()}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex cursor-pointer items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="flex cursor-pointer items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Member Dashboard</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/dashboard/library" className="flex cursor-pointer items-center">
            <Library className="mr-2 h-4 w-4" />
            <span>Content Library</span>
          </Link>
        </DropdownMenuItem>

        {showSubscriptionEntry && (
          <DropdownMenuItem asChild>
            <Link
              to="/dashboard/subscribe"
              className="flex cursor-pointer items-center text-amber-700"
            >
              <Crown className="mr-2 h-4 w-4" />
              <span>Subscribe</span>
            </Link>
          </DropdownMenuItem>
        )}

        {canAccessAdmin && (
          <DropdownMenuItem asChild>
            <Link to={getAdminDashboardPath(role)} className="flex cursor-pointer items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>
                {isOwner ? 'Owner Dashboard' : isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}
              </span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex cursor-pointer items-center text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;
