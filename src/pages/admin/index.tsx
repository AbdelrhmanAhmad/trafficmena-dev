import {
  Activity,
  BadgeCheck,
  BookOpen,
  Calendar,
  Clock,
  CreditCard,
  Mail,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminMetricsOverview } from '@/app/hooks/useAdminMetrics';
import { useInvitations } from '@/app/hooks/useInvitations';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import { useIsManager } from '@/shared/hooks/custom/useIsManager';

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, trend }) => (
  <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20 p-2">
          <Icon className="h-6 w-6 text-[#05ef62]" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium leading-none text-neutral-700">{label}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-600">{trend}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const formatCount = (value: number) => value.toLocaleString();
const formatRevenue = (cents: number) => `${Math.round(cents / 100).toLocaleString()} EGP`;

const AdminDashboard: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isManager, loading: managerLoading } = useIsManager();
  const isManagerOnly = isManager && !isAdmin;
  const loading = adminLoading || managerLoading;
  const metricsEnabled = !loading && isAdmin;
  const {
    data: adminMetrics,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useAdminMetricsOverview({ enabled: metricsEnabled });
  const {
    data: invitationData,
    isLoading: invitationsLoading,
    isError: invitationsError,
  } = useInvitations({ page: 1, pageSize: 50 }, { enabled: metricsEnabled });

  const invitationStats = useMemo(() => {
    const items = invitationData?.items ?? [];
    const accepted = items.filter((item) => item.status === 'accepted').length;
    const activated = items.filter((item) => Boolean(item.activatedAt)).length;
    const expired = items.filter((item) => item.status === 'expired').length;
    const pending = items.filter((item) => item.status === 'pending').length;
    const sent = items.filter((item) => item.status === 'sent').length;
    const total = invitationData?.pagination.total ?? items.length;

    return {
      accepted,
      activated,
      expired,
      pending,
      sent,
      total,
    };
  }, [invitationData]);

  const awaitingActivation = useMemo(() => {
    const awaiting = invitationStats.accepted - invitationStats.activated;
    return awaiting > 0 ? awaiting : 0;
  }, [invitationStats.accepted, invitationStats.activated]);

  const metricsStatus = useMemo(() => {
    if (!metricsEnabled) return 'Admin access required';
    if (metricsLoading) return 'Loading metrics...';
    if (metricsError) return 'Unable to load metrics';
    const asOfDate = adminMetrics?.asOf
      ? new Date(adminMetrics.asOf).toLocaleDateString()
      : new Date().toLocaleDateString();
    return `As of ${asOfDate}`;
  }, [metricsEnabled, metricsLoading, metricsError, adminMetrics?.asOf]);

  const userMetrics = adminMetrics?.users;
  const metricsPlaceholder = !metricsEnabled || metricsLoading || metricsError || !userMetrics;

  const managerQuickLinks = [
    {
      label: 'Content Library',
      description: 'Manage resources, tracks, and series.',
      href: '/admin/library',
      icon: BookOpen,
    },
    {
      label: 'Events & Tracks',
      description: 'Publish and manage upcoming events.',
      href: '/admin/meetups',
      icon: Calendar,
    },
    {
      label: 'User Management',
      description: 'View and filter community members.',
      href: '/admin/users',
      icon: Users,
    },
    {
      label: 'User Invitations',
      description: 'Invite new members to the platform.',
      href: '/admin/invitations',
      icon: Mail,
    },
  ];

  const coreMetrics = [
    {
      label: 'Total Users',
      value: metricsPlaceholder ? '—' : formatCount(userMetrics.total),
      icon: Users,
      trend: metricsStatus,
    },
    {
      label: 'Premium Users',
      value: metricsPlaceholder ? '—' : formatCount(userMetrics.premium),
      icon: BadgeCheck,
      trend: metricsStatus,
    },
    {
      label: 'Free Users',
      value: metricsPlaceholder ? '—' : formatCount(userMetrics.free),
      icon: UserCheck,
      trend: metricsStatus,
    },
    {
      label: 'Active Subscriptions',
      value: metricsPlaceholder ? '—' : formatCount(userMetrics.activeSubscriptions),
      icon: Activity,
      trend: metricsStatus,
    },
    {
      label: 'Subscription Revenue',
      value: metricsPlaceholder
        ? '—'
        : formatRevenue(adminMetrics?.subscriptions.revenueCents ?? 0),
      icon: CreditCard,
      trend: metricsStatus,
    },
  ];

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                {loading
                  ? 'Loading...'
                  : isAdmin
                    ? 'Admin Dashboard'
                    : isManager
                      ? 'Manager Dashboard'
                      : 'Dashboard'}
              </h1>
              <p className="mt-2 text-neutral-700">
                {loading
                  ? 'Determining access level...'
                  : isAdmin
                    ? 'Complete platform overview with administrative controls and business analytics.'
                    : isManager
                      ? 'Manage events, content, and monitor platform engagement.'
                      : 'Welcome to the TrafficMENA platform.'}
              </p>
            </div>
          </div>

          {/* Dashboard Content for Admin/Manager */}
          {isAdmin ? (
            <>
              {/* Key Metrics Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                    <TrendingUp className="h-5 w-5 text-[#05ef62]" />
                  </div>
                  <h2 className="text-2xl font-semibold text-neutral-900">Business Metrics</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {coreMetrics.map((metric) => (
                    <MetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      icon={metric.icon}
                      trend={metric.trend}
                    />
                  ))}
                </div>
                {!metricsEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Admin access required to view user and sales metrics.
                  </p>
                ) : metricsError ? (
                  <p className="text-xs text-destructive">Unable to load user metrics right now.</p>
                ) : null}
              </div>

              <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                      <CreditCard className="h-5 w-5 text-[#05ef62]" />
                    </div>
                    <CardTitle className="text-neutral-900">Paid Sales</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!metricsEnabled ? (
                    <p className="text-sm text-muted-foreground">
                      Admin access required to view paid sales metrics.
                    </p>
                  ) : metricsError ? (
                    <p className="text-sm text-destructive">Unable to load paid sales right now.</p>
                  ) : (
                    <Tabs defaultValue="events">
                      <TabsList>
                        <TabsTrigger value="events">Events</TabsTrigger>
                        <TabsTrigger value="tracks">Tracks</TabsTrigger>
                      </TabsList>
                      <TabsContent value="events">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Paid purchases</p>
                            <div className="mt-1 text-2xl font-semibold">
                              {metricsPlaceholder
                                ? '—'
                                : formatCount(adminMetrics?.paidSales.events.count ?? 0)}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue</p>
                            <div className="mt-1 text-2xl font-semibold">
                              {metricsPlaceholder
                                ? '—'
                                : formatRevenue(adminMetrics?.paidSales.events.revenueCents ?? 0)}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="tracks">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Paid purchases</p>
                            <div className="mt-1 text-2xl font-semibold">
                              {metricsPlaceholder
                                ? '—'
                                : formatCount(adminMetrics?.paidSales.tracks.count ?? 0)}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue</p>
                            <div className="mt-1 text-2xl font-semibold">
                              {metricsPlaceholder
                                ? '—'
                                : formatRevenue(adminMetrics?.paidSales.tracks.revenueCents ?? 0)}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                  {metricsEnabled && !metricsError ? (
                    <p className="text-xs text-muted-foreground">
                      Total paid sales:{' '}
                      {metricsPlaceholder
                        ? '—'
                        : `${formatCount(adminMetrics?.paidSales.total.count ?? 0)} · ${formatRevenue(
                            adminMetrics?.paidSales.total.revenueCents ?? 0,
                          )}`}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                      <Users className="h-5 w-5 text-[#05ef62]" />
                    </div>
                    <CardTitle className="text-neutral-900">Invitation Activation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!metricsEnabled ? (
                    <p className="text-sm text-muted-foreground">
                      Invitation metrics are available to admins only.
                    </p>
                  ) : invitationsError ? (
                    <p className="text-sm text-destructive">
                      Unable to load invitation activity right now.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total invitations</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-semibold">
                              {invitationsLoading ? '—' : invitationStats.total}
                            </span>
                            <Badge variant="outline">Issued</Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Accepted</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-semibold">
                              {invitationsLoading ? '—' : invitationStats.accepted}
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-900">
                              <BadgeCheck className="mr-1 h-3 w-3" />
                              Accepted
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Activated</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-semibold">
                              {invitationsLoading ? '—' : invitationStats.activated}
                            </span>
                            <Badge className="bg-primary-green text-primary" variant="secondary">
                              Session live
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Awaiting activation</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-semibold">
                              {invitationsLoading ? '—' : awaitingActivation}
                            </span>
                            <Badge className="bg-amber-100 text-amber-900">
                              <Clock className="mr-1 h-3 w-3" />
                              Follow up
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending sends</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-semibold">
                              {invitationsLoading ? '—' : invitationStats.pending}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Queued follow ups</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-semibold">
                              {invitationsLoading ? '—' : invitationStats.sent}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expired links</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-semibold">
                              {invitationsLoading ? '—' : invitationStats.expired}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Activation updates whenever new invitations load. Awaiting activation
                        captures accepted members who have not completed their OTP session yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dashboard Sections Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Activity Card */}
                <Card className="lg:col-span-1 rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                        <Activity className="h-5 w-5 text-[#05ef62]" />
                      </div>
                      <CardTitle className="text-neutral-900">Recent Activity</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {[
                        'Welcome to TrafficMENA Admin Dashboard',
                        'Your platform is ready for the first users',
                        'Create your first event to get started',
                        'Build your MENA marketing community',
                      ].map((activity) => (
                        <div key={activity} className="flex items-start gap-3">
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-green" />
                          <div className="flex-1">
                            <p className="text-foreground">{activity}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Growth Insights Card */}
                <Card className="lg:col-span-1 rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                        <TrendingUp className="h-5 w-5 text-[#05ef62]" />
                      </div>
                      <CardTitle className="text-neutral-900">Growth Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#05ef62] via-[#29cf9f] to-[#00fdc2]" />
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#05ef62] to-[#29cf9f]">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4zm0-6a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">Platform Ready</p>
                            <p className="text-neutral-700">Ready for your first users</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#29cf9f] via-[#00fdc2] to-[#05ef62]" />
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#29cf9f] to-[#00fdc2]">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">Events System</p>
                            <p className="text-neutral-700">Ready to create engaging events</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00fdc2] via-[#05ef62] to-[#29cf9f]" />
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00fdc2] to-[#05ef62]">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">Content Library</p>
                            <p className="text-neutral-700">Ready for valuable resources</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : isManagerOnly ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                  <Users className="h-5 w-5 text-[#05ef62]" />
                </div>
                <h2 className="text-2xl font-semibold text-neutral-900">Quick Links</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {managerQuickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.label}
                      className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                            <Icon className="h-5 w-5 text-[#05ef62]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-neutral-900">{item.label}</p>
                            <p className="text-sm text-neutral-600">{item.description}</p>
                            <Button variant="outline" asChild className="mt-4">
                              <Link to={item.href}>Open</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Regular User Message */
            <div className="py-12 text-center">
              <Card className="mx-auto max-w-lg rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                <CardContent className="p-8">
                  <h3 className="mb-4 text-xl font-semibold text-foreground">
                    Welcome to TrafficMENA
                  </h3>
                  <p className="mb-6 text-muted-foreground">
                    Access to the admin dashboard requires administrative or manager privileges.
                    Contact your administrator for more information.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button variant="outline" asChild>
                      <Link to="/meetups">
                        <Calendar className="mr-2 h-4 w-4" />
                        Browse Events
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard;
