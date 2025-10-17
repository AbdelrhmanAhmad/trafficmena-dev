import { Activity, BadgeCheck, Clock, TrendingUp, UserCheck, Users } from 'lucide-react';
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
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div className="ml-4">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{trend}</p>
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
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {loading
                  ? 'Loading...'
                  : isAdmin
                    ? 'Admin Dashboard'
                    : isManager
                      ? 'Manager Dashboard'
                      : 'Dashboard'}
              </h1>
              <p className="mt-2 text-muted-foreground">
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
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-primary">Business Metrics</h2>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invitation Activation
                  </CardTitle>
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
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
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
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Growth Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="font-medium text-green-900">Platform Ready</p>
                        <p className="text-green-700">Ready for your first users</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="font-medium text-blue-900">Events System</p>
                        <p className="text-blue-700">Ready to create engaging events</p>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-3">
                        <p className="font-medium text-purple-900">Content Library</p>
                        <p className="text-purple-700">Ready for valuable resources</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            /* Regular User Message */
            <div className="py-12 text-center">
              <Card className="mx-auto max-w-lg">
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
