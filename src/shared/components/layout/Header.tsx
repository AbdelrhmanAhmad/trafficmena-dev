import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Calendar,
  Crown,
  FileStack,
  Home,
  Info,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { useModuleFlags } from '@/app/hooks/useSettings';
import { SeriesCartNavButton } from '@/features/series/components/SeriesCartNavButton';
import { Button } from '@/shared/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/shared/components/ui/drawer';
import { useAuth } from '@/shared/context/AuthContext';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { captureAuthReturnFromLocation } from '@/shared/utils/authReturnPath';
import UserProfileDropdown from './UserProfileDropdown';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: 'digitalProducts' | 'masterclasses';
};

const NAVIGATION_ITEMS: NavItem[] = [
  { href: '/', label: 'home', icon: Home },
  { href: '/meetups', label: 'events', icon: Calendar },
  { href: '/tracks', label: 'tracks', icon: BookOpen },
  { href: '/digital-products', label: 'digitalProducts', icon: FileStack, module: 'digitalProducts' },
  { href: '/about', label: 'about', icon: Info },
];

const Header: React.FC = () => {
  const { t } = useTranslation(['nav', 'common', 'dashboard']);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { canAccessAdmin, isOwner, isAdmin, isManager } = useRolePermissions();
  const { data: subscription } = useCurrentSubscription({ enabled: !!user });
  const { digitalProductsEnabled, subscriptionsEnabled } = useModuleFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Check if user has an active subscription
  const hasActiveSubscription = subscription?.status === 'active';
  const showSubscriptionEntry = subscriptionsEnabled && !hasActiveSubscription;

  const visibleNavItems = NAVIGATION_ITEMS.filter((item) => {
    if (item.module === 'digitalProducts') return digitalProductsEnabled;
    return true;
  });

  const isRouteActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Fix Bug #6: Close drawer on route change
  // biome-ignore lint/correctness/useExhaustiveDependencies: simply reset drawer when route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const closeDrawer = () => setIsDrawerOpen(false);

  const captureAuthReturn = () => {
    captureAuthReturnFromLocation(location);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    closeDrawer();
  };

  return (
    <header className="sticky top-0 z-30">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/80 px-3 py-2 shadow-2xl">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/uploads/82e73a70-07ff-410e-b9f5-906aa4d1b00c.png"
              alt="TrafficMENA Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="text-sm font-semibold tracking-tight text-neutral-900">
              TrafficMENA
            </span>
          </Link>

          {/* Desktop Navigation - Only show on large screens */}
          <nav className="hidden items-center gap-6 md:flex">
            {visibleNavItems.map((item) => {
              const isActive = isRouteActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-neutral-900' : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  {t(`nav:${item.label}`)}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth - Only show on large screens */}
          <div className="flex items-center gap-2">
            <div className="hidden md:inline-flex items-center gap-2">
              <LanguageSwitcher />
              <SeriesCartNavButton variant="icon" />
              {showSubscriptionEntry && (
                <Link to={user ? '/dashboard/subscribe' : '/subscribe'}>
                  <Button
                    variant="outline"
                    className="inline-flex items-center gap-2 rounded-xl border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                  >
                    <Crown className="h-4 w-4" />
                    <span>{t('nav:subscribe')}</span>
                  </Button>
                </Link>
              )}
              {user ? (
                <UserProfileDropdown />
              ) : (
                <>
                  <Link to="/signin" onClick={captureAuthReturn}>
                    <Button
                      variant="outline"
                      className="rounded-lg border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      {t('common:actions.signIn')}
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={captureAuthReturn}>
                    <Button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-4 py-2 text-sm font-medium text-[#101010] hover:brightness-95 transition-colors">
                      <span>{t('common:actions.signUp')}</span>
                      <Users className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile/Tablet Menu Button - Show on medium and smaller screens */}
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 md:hidden"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">{t('nav:menuOpen')}</span>
                <span className="ms-2 text-sm font-medium text-neutral-800">{t('nav:menu')}</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="border-neutral-200 bg-white">
              <div className="space-y-6 p-6">
                {/* Close button */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <Menu className="h-4 w-4 text-neutral-600" />
                    <span className="text-sm font-medium text-neutral-700">{t('nav:menu')}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeDrawer}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-50"
                  >
                    <X className="h-4 w-4 text-neutral-700" />
                  </Button>
                </div>

                {/* Mobile/Tablet Navigation Links */}
                <nav className="space-y-1 px-4 py-4">
                  <SeriesCartNavButton variant="drawer" />
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isRouteActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={closeDrawer}
                        className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-neutral-100 text-neutral-900'
                            : 'text-neutral-800 hover:bg-neutral-50'
                        }`}
                      >
                        <span>{t(`nav:${item.label}`)}</span>
                        <Icon
                          className={`h-4 w-4 ${isActive ? 'text-neutral-700' : 'text-neutral-500'}`}
                        />
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile/Tablet Auth */}
                <div className="flex flex-col space-y-3 border-t border-neutral-200 pt-4">
                  <LanguageSwitcher className="w-full" />
                  {showSubscriptionEntry && (
                    <Link to={user ? '/dashboard/subscribe' : '/subscribe'} onClick={closeDrawer}>
                      <Button className="w-full justify-start rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-700 hover:bg-amber-100">
                        <Crown className="me-2 h-4 w-4" />
                        {t('nav:subscribe')}
                      </Button>
                    </Link>
                  )}
                  {user ? (
                    <>
                      <Link to="/profile/edit" onClick={closeDrawer}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-xl px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                        >
                          {t('dashboard:editProfile')}
                        </Button>
                      </Link>
                      <Link to="/dashboard/library" onClick={closeDrawer}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-xl px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                        >
                          {t('dashboard:contentLibrary')}
                        </Button>
                      </Link>
                      {canAccessAdmin && (
                        <Link to="/admin" onClick={closeDrawer}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start rounded-xl px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                          >
                            {isOwner
                              ? t('dashboard:adminOwner')
                              : isAdmin
                                ? t('dashboard:adminAdmin')
                                : isManager
                                  ? t('dashboard:adminManager')
                                  : t('dashboard:adminAdmin')}
                          </Button>
                        </Link>
                      )}
                      <Button
                        onClick={handleSignOut}
                        variant="outline"
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                      >
                        <LogOut className="me-2 h-4 w-4" />
                        {t('common:actions.signOut')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/signin" onClick={() => { captureAuthReturn(); closeDrawer(); }}>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                        >
                          {t('common:actions.signIn')}
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={() => { captureAuthReturn(); closeDrawer(); }}>
                        <Button className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-3 py-3 text-sm font-medium text-[#101010] hover:brightness-95">
                          {t('common:actions.signUp')}
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
