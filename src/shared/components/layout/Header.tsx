import { LogOut, Menu, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/shared/components/ui/drawer';
import { useAuth } from '@/shared/context/AuthContext';
import { useIsMobile } from '@/shared/hooks/custom/use-mobile';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import UserProfileDropdown from './UserProfileDropdown';

const NAVIGATION_ITEMS = [{ href: '/meetups', label: 'Meetups' }] as const;

const Header: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  // Fix Bug #6: Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const closeDrawer = () => setIsDrawerOpen(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    closeDrawer();
  };

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/lovable-uploads/82e73a70-07ff-410e-b9f5-906aa4d1b00c.png"
              alt="TrafficMENA Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="ml-3 text-xl font-bold text-primary-white">TrafficMENA</span>
          </Link>

          {/* Desktop Navigation - Only show on large screens */}
          <nav className="hidden items-center space-x-8 lg:flex">
            {NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="font-medium text-primary-white transition-colors duration-200 hover:text-primary-green"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth - Only show on large screens */}
          <div className="hidden items-center space-x-4 lg:flex">
            {user ? (
              <UserProfileDropdown />
            ) : (
              <>
                <Link to="/signin">
                  <Button
                    variant="outline"
                    className="rounded-lg border-primary-white bg-transparent px-6 py-2 font-semibold text-primary-white transition-all duration-300 hover:bg-primary-white hover:text-primary"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="transform rounded-lg bg-gradient-to-r from-primary-green to-primary-gradient px-6 py-2 font-semibold text-primary transition-all duration-300 hover:scale-105 hover:from-primary-gradient hover:to-secondary-teal">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile/Tablet Menu Button - Show on medium and smaller screens */}
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-white hover:bg-primary-white/10 lg:hidden"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="border-primary bg-primary">
              <div className="space-y-6 p-6">
                {/* Close button */}
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary-white">Menu</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeDrawer}
                    className="text-primary-white hover:bg-primary-white/10"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Mobile/Tablet Navigation Links */}
                <nav className="flex flex-col space-y-4">
                  {NAVIGATION_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={closeDrawer}
                      className="border-b border-gray-700 py-2 text-lg font-medium text-primary-white transition-colors duration-200 last:border-b-0 hover:text-primary-green"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile/Tablet Auth */}
                <div className="flex flex-col space-y-3 border-t border-gray-700 pt-4">
                  {user ? (
                    <>
                      <Link to="/profile/edit" onClick={closeDrawer}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start py-2 text-lg font-medium text-primary-white hover:bg-primary-white/10"
                        >
                          Edit Profile
                        </Button>
                      </Link>
                      <Link to="/dashboard/library" onClick={closeDrawer}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start py-2 text-lg font-medium text-primary-white hover:bg-primary-white/10"
                        >
                          Content Library
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={closeDrawer}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start py-2 text-lg font-medium text-primary-white hover:bg-primary-white/10"
                          >
                            Admin Dashboard
                          </Button>
                        </Link>
                      )}
                      <Button
                        onClick={handleSignOut}
                        variant="outline"
                        className="w-full border-primary-white bg-transparent font-semibold text-primary-white hover:bg-primary-white hover:text-primary"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/signin" onClick={closeDrawer}>
                        <Button
                          variant="outline"
                          className="w-full border-primary-white bg-transparent font-semibold text-primary-white hover:bg-primary-white hover:text-primary"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={closeDrawer}>
                        <Button className="w-full bg-gradient-to-r from-primary-green to-primary-gradient font-semibold text-primary hover:from-primary-gradient hover:to-secondary-teal">
                          Sign Up
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
};

export default Header;
