import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Settings, 
  LayoutDashboard, 
  Library, 
  Shield, 
  LogOut 
} from 'lucide-react';

interface UserProfile {
  first_name?: string;
  last_name?: string;
  role?: string;
}

const UserProfileDropdown: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    if (user) {
      fetchUserProfile(abortController.signal, isMounted);
    } else {
      setUserProfile(null);
    }
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user]);

  const fetchUserProfile = async (signal: AbortSignal, isMounted: boolean) => {
    if (!user || signal.aborted) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', user.id)
        .abortSignal(signal)
        .maybeSingle();

      // Check if component is still mounted and request wasn't aborted
      if (!isMounted || signal.aborted) return;

      if (error) {
        console.error('Profile fetch error:', error);
        // Set minimal profile data on error
        setUserProfile({ first_name: '', last_name: '', role: 'user' });
        return;
      }

      if (data) {
        setUserProfile(data);
      } else {
        // Profile doesn't exist yet - set default values
        setUserProfile({ first_name: '', last_name: '', role: 'user' });
      }
    } catch (error) {
      // Only handle non-abort errors
      if (!signal.aborted && isMounted) {
        console.error('Unexpected profile fetch error:', error);
        setUserProfile({ first_name: '', last_name: '', role: 'user' });
      }
    }
  };

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
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name[0]}${userProfile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return user?.email || 'User';
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-primary transition-all">
          <Avatar className="h-8 w-8 ring-2 ring-primary-white/20 hover:ring-primary-green transition-all">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={getDisplayName()} />
            <AvatarFallback className="bg-gradient-to-br from-primary-green to-secondary-teal text-primary font-semibold text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-72 bg-card border border-border shadow-lg z-50" 
        align="end"
        forceMount
      >
        <div className="flex items-center space-x-3 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={getDisplayName()} />
            <AvatarFallback className="bg-gradient-to-br from-primary-green to-secondary-teal text-primary font-semibold text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex items-center cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="flex items-center cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Member Dashboard</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/dashboard/library" className="flex items-center cursor-pointer">
            <Library className="mr-2 h-4 w-4" />
            <span>Content Library</span>
          </Link>
        </DropdownMenuItem>
        
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex items-center cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Dashboard</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;