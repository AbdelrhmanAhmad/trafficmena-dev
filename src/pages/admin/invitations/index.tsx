import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, Mail, Send, Upload, Users } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { InvitationStatus } from '@/app/api/invitations';
import {
  useBulkInvitations,
  useCreateInvitation,
  useInvitationStats,
  useInvitations,
} from '@/app/hooks/useInvitations';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { cn } from '@/shared/lib/utils';
import { useErrorHandler } from '@/shared/utils/errorHandling';

const formSchema = z.object({
  email: z.string().email('Enter a valid email address').trim(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  customMessage: z.string().max(600).optional(),
});

type InvitationFormValues = z.infer<typeof formSchema>;

type StatusFilter = 'all' | InvitationStatus;

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
  { value: 'accepted', label: 'Accepted' },
];

const statusStyles: Record<InvitationStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
  sent: 'bg-sky-100 text-sky-900 border-sky-200',
  accepted: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  expired: 'bg-slate-100 text-slate-700 border-slate-200',
  failed: 'bg-rose-100 text-rose-900 border-rose-200',
};

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200] as const;

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminInvitations() {
  const emailFieldId = useId();
  const firstNameFieldId = useId();
  const lastNameFieldId = useId();
  const customMessageFieldId = useId();
  const statusFilterFieldId = useId();
  const searchFieldId = useId();
  const pageSizeFieldId = useId();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [bulkSummary, setBulkSummary] = useState<{
    created: number;
    errors: Array<{ line: number; email: string; reason: string }>;
  } | null>(null);
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError } = useInvitations({
    page,
    pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
  });
  const { data: statsData, isLoading: statsLoading } = useInvitationStats();

  const createInvitationMutation = useCreateInvitation();
  const bulkInvitationMutation = useBulkInvitations();

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      customMessage: '',
    },
  });

  const stats = statsData ?? {
    total: 0,
    pending: 0,
    sent: 0,
    accepted: 0,
    activated: 0,
    expired: 0,
    failed: 0,
  };

  const metricCards = [
    { label: 'Total invites', value: stats.total, accent: 'text-primary' },
    { label: 'Pending', value: stats.pending, accent: 'text-amber-600' },
    { label: 'Sent', value: stats.sent, accent: 'text-sky-600' },
    { label: 'Accepted', value: stats.accepted, accent: 'text-emerald-600' },
    { label: 'Activated', value: stats.activated, accent: 'text-primary' },
    { label: 'Expired', value: stats.expired, accent: 'text-neutral-600' },
    { label: 'Failed', value: stats.failed, accent: 'text-rose-600' },
  ];
  const invitationItems = data?.items ?? [];
  const invitationTotal = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(invitationTotal / pageSize));

  const handlePrevious = () => {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  };

  const handleNext = () => {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  };

  const onSubmit = async (values: InvitationFormValues) => {
    try {
      await createInvitationMutation.mutateAsync({
        email: values.email.trim(),
        firstName: values.firstName?.trim() ? values.firstName.trim() : undefined,
        lastName: values.lastName?.trim() ? values.lastName.trim() : undefined,
        customMessage: values.customMessage?.trim() ? values.customMessage.trim() : undefined,
      });
      toast({
        title: 'Invitation sent',
        description: `We emailed ${values.email} with their access link.`,
      });
      form.reset();
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: 'Unable to send invitation',
        description: appError.message,
        variant: 'destructive',
      });
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkSummary(null);

    try {
      const result = await bulkInvitationMutation.mutateAsync(file);
      setBulkSummary({ created: result.created.length, errors: result.errors });
      toast({
        title: 'Bulk invitations processed',
        description: `${result.created.length} invites sent. ${result.errors.length} rows skipped.`,
      });
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: 'Bulk upload failed',
        description: appError.message,
        variant: 'destructive',
      });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                <Users className="h-5 w-5 text-[#05ef62]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">Invitations</h1>
                <p className="text-neutral-600">
                  Invite prospects directly from the dashboard. Send a single invite or upload a
                  small CSV for quick batches.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                    <Mail className="h-4 w-4 text-[#05ef62]" />
                  </div>
                  Send a new invitation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={emailFieldId}>Email *</Label>
                    <Input
                      id={emailFieldId}
                      type="email"
                      placeholder="prospect@company.com"
                      {...form.register('email')}
                      required
                      autoComplete="email"
                      className="rounded-xl border-neutral-200 bg-white/70 backdrop-blur"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-rose-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={firstNameFieldId}>First name</Label>
                      <Input
                        id={firstNameFieldId}
                        placeholder="Ranya"
                        {...form.register('firstName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={lastNameFieldId}>Last name</Label>
                      <Input
                        id={lastNameFieldId}
                        placeholder="El Haddad"
                        {...form.register('lastName')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={customMessageFieldId}>Personal note</Label>
                    <Textarea
                      id={customMessageFieldId}
                      placeholder="Add context or next steps (optional)"
                      rows={4}
                      {...form.register('customMessage')}
                    />
                    {form.formState.errors.customMessage && (
                      <p className="text-sm text-rose-600">
                        {form.formState.errors.customMessage.message}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    • Invitations include a secure signup link and expire in 72 hours.
                    <br />• Simple guardrail: up to 1,000 invites per admin per day.
                  </p>

                  <Button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3 text-[#101010] font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    disabled={createInvitationMutation.isPending}
                  >
                    {createInvitationMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending invitation…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" /> Send invitation
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg text-neutral-900">
                  Team activity & bulk upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {metricCards.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur p-3"
                    >
                      <p className="text-xs text-neutral-500">{metric.label}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {statsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#05ef62]" />
                        ) : (
                          <span className={cn('text-2xl font-semibold', metric.accent)}>
                            {metric.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Upload className="h-4 w-4 text-primary" /> Upload CSV (max 200 rows)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Columns supported: <code>email</code>, <code>first_name</code>,{' '}
                      <code>last_name</code>, <code>custom_message</code>. Header row optional.
                    </p>
                    <Input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleBulkUpload}
                      disabled={bulkInvitationMutation.isPending}
                      className="mt-2"
                    />
                    {bulkInvitationMutation.isPending && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing CSV…
                      </p>
                    )}
                    {bulkSummary && (
                      <div className="mt-3 rounded border bg-muted/20 p-3 text-xs">
                        <p className="font-medium text-primary">
                          {bulkSummary.created} invitations created successfully.
                        </p>
                        {bulkSummary.errors.length > 0 && (
                          <div className="mt-2 space-y-1 text-rose-600">
                            <p className="font-semibold">Skipped rows</p>
                            <ul className="space-y-1">
                              {bulkSummary.errors.slice(0, 5).map((error, index) => (
                                <li key={`${error.email}-${error.line}-${index}`}>
                                  Line {error.line} ({error.email || 'missing email'}):{' '}
                                  {error.reason}
                                </li>
                              ))}
                            </ul>
                            {bulkSummary.errors.length > 5 && (
                              <p>+ {bulkSummary.errors.length - 5} more…</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={statusFilterFieldId}>Filter by status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(value: StatusFilter) => {
                        setStatusFilter(value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger id={statusFilterFieldId}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> CSV imports larger than 200
                    rows remain deferred for MVP. For bigger lists, batch uploads manually.
                  </p>
                  <p className="mt-2">
                    Need to update or resend an invite? Issue a new link above—older pending invites
                    automatically expire when a new one is created.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                  <Mail className="h-4 w-4 text-[#05ef62]" />
                </div>
                Invitation log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-sm">
                  <Label htmlFor={searchFieldId} className="sr-only">
                    Search invitations by email
                  </Label>
                  <Input
                    id={searchFieldId}
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by email"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={pageSizeFieldId} className="sr-only">
                    Invitations per page
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id={pageSizeFieldId} className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading invitations…
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center py-16 text-rose-600">
                  Unable to load invitation log right now.
                </div>
              ) : invitationItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                  <Mail className="h-10 w-10" />
                  <p>No invitations match your current filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Accepted</TableHead>
                      <TableHead>Activated</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitationItems.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium text-primary">{invite.email}</TableCell>
                        <TableCell>
                          {invite.firstName || invite.lastName
                            ? [invite.firstName, invite.lastName].filter(Boolean).join(' ')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'border text-xs font-medium',
                              statusStyles[invite.status],
                            )}
                          >
                            {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(invite.sentAt ?? invite.createdAt)}</TableCell>
                        <TableCell>{formatDate(invite.acceptedAt)}</TableCell>
                        <TableCell>{formatDate(invite.activatedAt)}</TableCell>
                        <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-neutral-500">
                  Showing {invitationItems.length} of {invitationTotal} invitations
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-neutral-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={page >= totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
}
