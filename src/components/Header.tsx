
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Menu, X, LogOut } from 'lucide-react';
import UserProfileDropdown from './UserProfileDropdown';

const NAVIGATION_ITEMS = [
  { href: "/meetups", label: "Meetups" },
] as const;

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
    <header className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/82e73a70-07ff-410e-b9f5-906aa4d1b00c.png" 
              alt="TrafficMENA Logo" 
              className="h-10 w-10 object-contain"
            />
            <span className="ml-3 text-xl font-bold text-primary-white">
              TrafficMENA
            </span>
          </Link>

          {/* Desktop Navigation - Only show on large screens */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAVIGATION_ITEMS.map((item) => (
              <Link 
                key={item.href}
                to={item.href} 
                className="text-primary-white hover:text-primary-green transition-colors duration-200 font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth - Only show on large screens */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <UserProfileDropdown />
            ) : (
              <>
                <Link to="/signin">
                  <Button 
                    variant="outline"
                    className="border-primary-white text-primary-white hover:bg-primary-white hover:text-primary font-semibold px-6 py-2 rounded-lg transition-all duration-300 bg-transparent"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button 
                    className="bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-primary font-semibold px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
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
                className="lg:hidden text-primary-white hover:bg-primary-white/10"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-primary border-primary">
              <div className="p-6 space-y-6">
                {/* Close button */}
                <div className="flex justify-between items-center">
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
                      className="text-primary-white hover:text-primary-green transition-colors duration-200 font-medium text-lg py-2 border-b border-gray-700 last:border-b-0"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile/Tablet Auth */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-700">
                  {user ? (
                    <>
                      <Link to="/profile/edit" onClick={closeDrawer}>
                        <Button 
                          variant="ghost"
                          className="w-full justify-start text-primary-white hover:bg-primary-white/10 font-medium text-lg py-2"
                        >
                          Edit Profile
                        </Button>
                      </Link>
                      <Link to="/dashboard/library" onClick={closeDrawer}>
                        <Button 
                          variant="ghost"
                          className="w-full justify-start text-primary-white hover:bg-primary-white/10 font-medium text-lg py-2"
                        >
                          Content Library
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={closeDrawer}>
                          <Button 
                            variant="ghost"
                            className="w-full justify-start text-primary-white hover:bg-primary-white/10 font-medium text-lg py-2"
                          >
                            Admin Dashboard
                          </Button>
                        </Link>
                      )}
                      <Button 
                        onClick={handleSignOut}
                        variant="outline"
                        className="w-full border-primary-white text-primary-white hover:bg-primary-white hover:text-primary font-semibold bg-transparent"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/signin" onClick={closeDrawer}>
                        <Button 
                          variant="outline"
                          className="w-full border-primary-white text-primary-white hover:bg-primary-white hover:text-primary font-semibold bg-transparent"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={closeDrawer}>
                        <Button 
                          className="w-full bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-primary font-semibold"
                        >
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
