import { Activity, BadgeCheck, Clock, Sparkles, TrendingUp, UserCheck, Users } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInvitations } from '@/app/hooks/useInvitations';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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

const AdminDashboard: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isManager, loading: managerLoading } = useIsManager();
  const {
    data: invitationData,
    isLoading: invitationsLoading,
    isError: invitationsError,
  } = useInvitations({ page: 1, pageSize: 50 });
  const loading = adminLoading || managerLoading;

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
  // Invitation-focused metrics surfaced on the dashboard while broader analytics are deferred
  const coreMetrics = [
    {
      label: 'Accepted Invitations',
      value: invitationsLoading ? '—' : invitationStats.accepted,
      icon: BadgeCheck,
      trend: invitationsLoading
        ? 'Loading invitation activity...'
        : awaitingActivation > 0
          ? `${awaitingActivation} awaiting activation`
          : 'All accepted members activated',
    },
    {
      label: 'Activated Members',
      value: invitationsLoading ? '—' : invitationStats.activated,
      icon: UserCheck,
      trend: invitationsLoading
        ? 'Refreshing session links'
        : `${invitationStats.total} total invitations`,
    },
  ];

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AdminLayout>
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
          {isAdmin || isManager ? (
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
                <p className="text-xs text-muted-foreground">
                  Broader platform metrics stay hidden until the `/api/admin/metrics` endpoint
                  ships.
                </p>
              </div>

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
                  {invitationsError ? (
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
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4zm0-6a2 2 0 100-4 2 2 0 000 4z"/>
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
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6z"/>
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
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
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
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard;
