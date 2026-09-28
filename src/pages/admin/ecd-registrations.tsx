import { CheckCircle2, DoorOpen, Download, Loader2, Mail, Plus, RefreshCw, Search, Ticket, Trash2, Upload, UserCheck, X } from 'lucide-react';
import * as QRCode from 'qrcode';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkCreateEcdManualRegistrations,
  createEcdManualRegistration,
  deleteEcdRegistrations,
  fetchEcdRegistrations,
  sendEcdTicketEmail,
  sessionCheckInEcdWorkshop,
  updateEcdTicketEmail,
  venueCheckInEcdRegistration,
  verifyEcdRegistrationPayment,
  type EcdRegistrationListItem,
  type EcdTicketRow,
  type EcdWorkshopReservation,
} from '@/app/api/ecd';
import { EcdAttendeeFrameCard } from '@/features/ecd/components/EcdAttendeeFrameCard';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { ApiError } from '@/app/api/client';

const TRACK_LABELS: Record<number, string> = {
  0: 'Control Tower',
  1: 'Second Stage',
  2: 'CLICKED',
  3: 'CONFIRMED',
  4: 'DELIVERED',
};

function StatusBadge({ status }: { status: string }) {
  let className = 'bg-neutral-100 text-neutral-700';
  if (status === 'paid') className = 'bg-emerald-100 text-emerald-800';
  if (status === 'pending') className = 'bg-amber-100 text-amber-800';
  if (status === 'failed' || status === 'expired' || status === 'cancelled') {
    className = 'bg-red-100 text-red-800';
  }
  return <Badge className={className}>{status}</Badge>;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function TicketQr({ payload }: { payload: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 160,
      color: { dark: '#101010', light: '#FFFFFF' },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!src) {
    return <div className="h-40 w-40 animate-pulse rounded-lg bg-neutral-100" />;
  }

  return (
    <img
      src={src}
      alt="Booking QR"
      className="h-40 w-40 rounded-lg border border-neutral-200 bg-white p-1"
    />
  );
}

function TicketAdminCard({
  ticket,
  bookingPageUrl,
  onUpdated,
}: {
  ticket: EcdTicketRow;
  bookingPageUrl: string;
  onUpdated: (ticket: EcdTicketRow) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState(ticket.attendeeEmail);

  useEffect(() => {
    setEmail(ticket.attendeeEmail);
  }, [ticket.attendeeEmail, ticket.id]);

  const saveMutation = useMutation({
    mutationFn: () => updateEcdTicketEmail(ticket.id, email.trim()),
    onSuccess: (updated) => {
      onUpdated(updated);
      toast({ title: 'Email updated', description: updated.attendeeEmail });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Could not save attendee email.',
        variant: 'destructive',
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendEcdTicketEmail(ticket.id, email.trim()),
    onSuccess: (result) => {
      onUpdated({ ...ticket, attendeeEmail: result.email });
      toast({ title: 'Ticket emailed', description: `Sent to ${result.email}` });
    },
    onError: () => {
      toast({
        title: 'Send failed',
        description: 'Could not send ticket email. Check Resend config.',
        variant: 'destructive',
      });
    },
  });

  const busy = saveMutation.isPending || sendMutation.isPending;

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <TicketQr payload={bookingPageUrl} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="font-medium text-neutral-900">{ticket.attendeeName}</div>
          <div className="font-mono text-[11px] break-all text-neutral-600">{ticket.serial}</div>
          <div className="font-mono text-[10px] break-all text-neutral-400">{bookingPageUrl}</div>
          <div className="text-xs text-neutral-500">Status: {ticket.status}</div>
          <div className="space-y-1.5">
            <Label htmlFor={`ecd-email-${ticket.id}`} className="text-xs">
              Attendee email
            </Label>
            <Input
              id={`ecd-email-${ticket.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !email.trim() || email.trim() === ticket.attendeeEmail}
              onClick={() => saveMutation.mutate()}
            >
              Save email
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || !email.trim()}
              onClick={() => sendMutation.mutate()}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              {sendMutation.isPending ? 'Sending…' : 'Send ticket email'}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

function VenueCheckInButton({
  row,
  onDone,
}: {
  row: EcdRegistrationListItem;
  onDone: (at: string) => void;
}) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => venueCheckInEcdRegistration(row.id),
    onSuccess: (data) => {
      if (data.venueCheckedInAt) onDone(data.venueCheckedInAt);
      toast({
        title: data.alreadyCheckedIn ? 'Already checked in' : 'Venue check-in recorded',
        description: data.venueCheckedInAt
          ? formatWhen(data.venueCheckedInAt) || undefined
          : undefined,
      });
    },
    onError: () => {
      toast({
        title: 'Check-in failed',
        description: 'Could not record venue attendance.',
        variant: 'destructive',
      });
    },
  });

  if (row.paymentStatus !== 'paid') {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        Pay first
      </Button>
    );
  }

  if (row.venueCheckedInAt) {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        In · {formatWhen(row.venueCheckedInAt)}
      </Badge>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <UserCheck className="mr-1.5 h-3.5 w-3.5" />
      {mutation.isPending ? '…' : 'Mark present'}
    </Button>
  );
}

function VerifyPaymentButton({
  row,
  onDone,
}: {
  row: EcdRegistrationListItem;
  onDone: (patch: Partial<EcdRegistrationListItem>) => void;
}) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => verifyEcdRegistrationPayment(row.id),
    onSuccess: (data) => {
      const status = data.paymentStatus || data.status;
      onDone({
        paymentStatus: status,
        paidAt: data.paidAt ?? row.paidAt,
        amountFormatted: data.amountFormatted || row.amountFormatted,
      });
      if (status === 'paid') {
        toast({
          title: data.alreadyProcessed ? 'Already paid' : 'Payment confirmed',
          description: data.orderCode,
        });
        return;
      }
      toast({
        title: 'Still pending',
        description: `Gateway status: ${status}. Try again after the bank confirms.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Verify failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  if (row.paymentStatus === 'paid') {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${mutation.isPending ? 'animate-spin' : ''}`} />
      {mutation.isPending ? 'Verifying…' : 'Verify payment'}
    </Button>
  );
}

function WorkshopSessionRow({
  workshop,
  venueCheckedInAt,
  onCheckedIn,
}: {
  workshop: EcdWorkshopReservation;
  venueCheckedInAt: string | null;
  onCheckedIn: (id: string, at: string) => void;
}) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => sessionCheckInEcdWorkshop(workshop.id),
    onSuccess: (data) => {
      if (data.sessionCheckedInAt) onCheckedIn(workshop.id, data.sessionCheckedInAt);
      toast({
        title: data.alreadyCheckedIn ? 'Already in session' : 'Session entry recorded',
        description: workshop.title,
      });
    },
    onError: () => {
      toast({
        title: 'Session check-in failed',
        description: 'Could not record room entry.',
        variant: 'destructive',
      });
    },
  });

  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            {TRACK_LABELS[workshop.trackIndex] || `Track ${workshop.trackIndex}`} ·{' '}
            {workshop.timeLabel}
          </div>
          <div className="font-medium text-neutral-900">{workshop.title}</div>
          <div className="font-mono text-[11px] text-neutral-500">{workshop.slug}</div>
          {workshop.sessionCheckedInAt ? (
            <Badge className="mt-1 gap-1 bg-emerald-100 text-emerald-800">
              <DoorOpen className="h-3.5 w-3.5" />
              Entered · {formatWhen(workshop.sessionCheckedInAt)}
            </Badge>
          ) : null}
        </div>
        {!workshop.sessionCheckedInAt ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={mutation.isPending || !venueCheckedInAt}
            title={
              venueCheckedInAt
                ? 'Confirm room / workshop entry'
                : 'Venue check-in required first (bracelet)'
            }
            onClick={() => mutation.mutate()}
          >
            <DoorOpen className="mr-1.5 h-3.5 w-3.5" />
            {mutation.isPending ? '…' : 'Enter room'}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

const EcdRegistrationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [ticketType, setTicketType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [grantReasonFilter, setGrantReasonFilter] = useState('');
  const [grantReasonApplied, setGrantReasonApplied] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EcdRegistrationListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualTicketType, setManualTicketType] = useState<'ct' | 'fj'>('ct');
  const [manualFree, setManualFree] = useState(true);
  const [manualReason, setManualReason] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [csvErrors, setCsvErrors] = useState<Array<{ line: number; email: string; reason: string }>>(
    [],
  );

  const queryKey = [
    'admin',
    'ecd-registrations',
    search,
    ticketType,
    status,
    source,
    grantReasonApplied,
    page,
  ] as const;

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchEcdRegistrations({
        q: search || undefined,
        ticketType: ticketType === 'all' ? undefined : ticketType,
        status: status === 'all' ? undefined : status,
        source: source === 'all' ? undefined : source,
        grantReason: grantReasonApplied || undefined,
        page,
        pageSize: 25,
      }),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.pagination.total ?? 0;
  const pageSize = query.data?.pagination.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const summary = useMemo(() => {
    const paid = items.filter((i) => i.paymentStatus === 'paid').length;
    const venueIn = items.filter((i) => i.venueCheckedInAt).length;
    return { paid, venueIn, shown: items.length, total };
  }, [items, total]);

  const allVisibleSelected =
    items.length > 0 && items.every((row) => selectedIds.includes(row.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !items.some((row) => row.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of items) next.add(row.id);
      return Array.from(next);
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const invalidateList = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-registrations'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createEcdManualRegistration({
        name: manualName.trim(),
        email: manualEmail.trim(),
        phone: manualPhone.trim(),
        ticketType: manualTicketType,
        isComplimentary: manualFree,
        grantReason: manualReason.trim(),
      }),
    onSuccess: () => {
      toast({ title: 'Registration created', description: 'Ticket email sent.' });
      setManualName('');
      setManualEmail('');
      setManualPhone('');
      setManualReason('');
      setManualFree(true);
      invalidateList();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not create registration.';
      toast({ title: 'Create failed', description: message, variant: 'destructive' });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (csv: string) => bulkCreateEcdManualRegistrations(csv),
    onSuccess: (data) => {
      setCsvErrors([]);
      toast({
        title: 'Bulk upload complete',
        description: `Created ${data.createdCount} registration(s). Ticket emails sent.`,
      });
      if (bulkInputRef.current) bulkInputRef.current.value = '';
      invalidateList();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        const details = error.extra?.details as
          | { errors?: Array<{ line: number; email: string; reason: string }> }
          | undefined;
        const errors = details?.errors;
        if (Array.isArray(errors) && errors.length) {
          setCsvErrors(errors);
          toast({
            title: 'CSV validation failed',
            description: 'No rows were applied. Fix the errors below.',
            variant: 'destructive',
          });
          return;
        }
        toast({
          title: 'Bulk upload failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Bulk upload failed',
        description: 'Could not process CSV.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEcdRegistrations(selectedIds),
    onSuccess: (data) => {
      toast({ title: 'Deleted', description: `Removed ${data.deleted} registration(s).` });
      setSelectedIds([]);
      setSelected(null);
      invalidateList();
    },
    onError: () => {
      toast({
        title: 'Delete failed',
        description: 'Could not delete selected registrations (admin role required).',
        variant: 'destructive',
      });
    },
  });

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      bulkMutation.mutate(text);
    };
    reader.readAsText(file);
  };

  const patchRow = (id: string, patch: Partial<EcdRegistrationListItem>) => {
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    void queryClient.setQueryData(
      queryKey,
      (old: { items: EcdRegistrationListItem[]; pagination: unknown } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        };
      },
    );
  };

  const handleTicketUpdated = (updated: EcdTicketRow) => {
    setSelected((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === updated.id ? { ...t, ...updated } : t,
        ),
        serials: prev.tickets.map((t) => (t.id === updated.id ? updated.serial : t.serial)),
      };
    });
    invalidateList();
  };

  const isAnyMutationPending =
    createMutation.isPending || bulkMutation.isPending || deleteMutation.isPending;

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">ECD Registrations</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Venue bracelet check-in (QR) vs workshop room entry — one day, one pass.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Ticket className="h-3.5 w-3.5" />
                {summary.total} total · {summary.paid} paid · {summary.venueIn} on-site
              </Badge>
              <Button
                type="button"
                variant={showAddPanel ? 'outline' : 'default'}
                onClick={() => setShowAddPanel((open) => !open)}
              >
                {showAddPanel ? (
                  <>
                    <X className="mr-1.5 h-4 w-4" />
                    Close form
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add registration
                  </>
                )}
              </Button>
            </div>
          </div>

          {showAddPanel ? (
          <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)]">
            <CardHeader>
              <CardTitle className="text-lg text-neutral-900">Add registration</CardTitle>
              <CardDescription className="text-neutral-600">
                Manual entries are marked paid immediately and receive the booking email. CSV
                columns: <code className="ml-1">name,email,phone,ticket_type,free,reason</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="ecd-manual-name">Full name *</Label>
                      <Input
                        id="ecd-manual-name"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        disabled={isAnyMutationPending}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ecd-manual-email">Email *</Label>
                      <Input
                        id="ecd-manual-email"
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        disabled={isAnyMutationPending}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ecd-manual-phone">Phone *</Label>
                      <Input
                        id="ecd-manual-phone"
                        type="tel"
                        placeholder="+2010… or 010…"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        disabled={isAnyMutationPending}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Package *</Label>
                      <Select
                        value={manualTicketType}
                        onValueChange={(v) => setManualTicketType(v as 'ct' | 'fj')}
                        disabled={isAnyMutationPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ct">Standard Pass</SelectItem>
                          <SelectItem value="fj">All Access Pass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2">
                      <div>
                        <Label htmlFor="ecd-manual-free">Complimentary (free)</Label>
                        <p className="text-xs text-neutral-500">Off = charge package price as paid</p>
                      </div>
                      <Switch
                        id="ecd-manual-free"
                        checked={manualFree}
                        onCheckedChange={setManualFree}
                        disabled={isAnyMutationPending}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="ecd-manual-reason">Grant reason *</Label>
                      <Input
                        id="ecd-manual-reason"
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        placeholder="Why are you granting this access?"
                        disabled={isAnyMutationPending}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => createMutation.mutate()}
                    disabled={
                      isAnyMutationPending ||
                      !manualName.trim() ||
                      !manualEmail.trim() ||
                      !manualPhone.trim() ||
                      manualReason.trim().length < 3
                    }
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                      </>
                    ) : (
                      'Create registration'
                    )}
                  </Button>
                </div>

                <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Upload className="h-4 w-4" /> Bulk CSV upload
                  </Label>
                  <Input
                    ref={bulkInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleBulkUpload}
                    disabled={isAnyMutationPending}
                  />
                  {bulkMutation.isPending ? (
                    <p className="text-sm text-muted-foreground">Processing CSV…</p>
                  ) : null}
                  {csvErrors.length > 0 ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <p className="font-semibold">Validation errors (no rows were applied)</p>
                      <ul className="mt-2 space-y-1">
                        {csvErrors.slice(0, 8).map((error, index) => (
                          <li key={`${error.line}-${index}`}>
                            Line {error.line} ({error.email || 'missing email'}): {error.reason}
                          </li>
                        ))}
                      </ul>
                      {csvErrors.length > 8 ? (
                        <p className="mt-1">+ {csvErrors.length - 8} more</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Header is optional. ticket_type: ct/standard or fj/allaccess. free: 1/0.
                      Rows are validated as all-or-nothing.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Search & filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  className="pl-9"
                  placeholder="Order, email, name, phone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      setSearch(q.trim());
                      setGrantReasonApplied(grantReasonFilter.trim());
                    }
                  }}
                />
              </div>
              <Select
                value={ticketType}
                onValueChange={(v) => {
                  setTicketType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ticket type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All packages</SelectItem>
                  <SelectItem value="ct">Standard Pass</SelectItem>
                  <SelectItem value="fj">All Access Pass</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={source}
                onValueChange={(v) => {
                  setSource(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="w-[180px]"
                placeholder="Grant reason…"
                value={grantReasonFilter}
                onChange={(e) => setGrantReasonFilter(e.target.value)}
              />
              <Button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSearch(q.trim());
                  setGrantReasonApplied(grantReasonFilter.trim());
                }}
              >
                Search
              </Button>
              {selectedIds.length > 0 ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${selectedIds.length} registration(s)? This cannot be undone.`,
                      )
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete ({selectedIds.length})
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all on page"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Buyer</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Package</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Venue</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                        Loading registrations…
                      </td>
                    </tr>
                  )}
                  {query.isError && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-red-600">
                        Failed to load ECD registrations.
                      </td>
                    </tr>
                  )}
                  {!query.isLoading && !query.isError && items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                        No registrations found.
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-neutral-50/80">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label={`Select ${row.orderCode}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.orderCode}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {row.attendeeFrameUrl ? (
                            <a
                              href={row.attendeeFrameUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                              title="Attending photo"
                            >
                              <img
                                src={row.attendeeFrameUrl}
                                alt=""
                                className="h-10 w-8 rounded object-cover border border-neutral-200"
                              />
                            </a>
                          ) : null}
                          <div>
                            <div className="font-medium text-neutral-900">{row.buyerName}</div>
                            <div className="text-xs text-neutral-500">{row.buyerEmail}</div>
                            {row.grantReason ? (
                              <div className="mt-0.5 text-[11px] text-neutral-400">
                                Reason: {row.grantReason}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                        {row.buyerMobile || '—'}
                      </td>
                      <td className="px-4 py-3">{row.ticketName}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            row.registrationSource === 'manual'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }
                        >
                          {row.registrationSource === 'manual' ? 'Manual' : 'Website'}
                        </Badge>
                        {row.isComplimentary ? (
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-emerald-700">
                            Free
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{row.amountFormatted}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge status={row.paymentStatus} />
                          <VerifyPaymentButton
                            row={row}
                            onDone={(patch) => patchRow(row.id, patch)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VenueCheckInButton
                          row={row}
                          onDone={(at) => patchRow(row.id, { venueCheckedInAt: at })}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(row)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{selected?.orderCode}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-5 text-sm">
                <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Buyer
                    </div>
                    <div className="mt-1 font-medium text-neutral-900">{selected.buyerName}</div>
                    <div className="text-neutral-600">{selected.buyerEmail}</div>
                    <div className="text-neutral-600">{selected.buyerMobile || '—'}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        className={
                          selected.registrationSource === 'manual'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }
                      >
                        {selected.registrationSource === 'manual' ? 'Manual' : 'Website'}
                      </Badge>
                      {selected.isComplimentary ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Complimentary</Badge>
                      ) : null}
                    </div>
                    {selected.grantReason ? (
                      <div className="mt-2 text-xs text-neutral-500">
                        Reason: {selected.grantReason}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Package
                    </div>
                    <div className="mt-1">
                      {selected.ticketName} × {selected.qty}
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between gap-4 text-neutral-600">
                        <span>Subtotal</span>
                        <span>
                          {selected.unitPriceFormatted ||
                            selected.amountFormatted}
                        </span>
                      </div>
                      {selected.discountCents > 0 ? (
                        <div className="flex justify-between gap-4 text-neutral-600">
                          <span>
                            Discount
                            {selected.promoCode ? ` (${selected.promoCode})` : ''}
                          </span>
                          <span className="text-emerald-700">
                            −{selected.discountFormatted || `${(selected.discountCents / 100).toFixed(0)} EGP`}
                          </span>
                        </div>
                      ) : selected.promoCode ? (
                        <div className="text-xs text-neutral-500">Promo {selected.promoCode}</div>
                      ) : null}
                      <div className="flex justify-between gap-4 font-medium text-neutral-900">
                        <span>Paid / due</span>
                        <span>{selected.amountFormatted}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={selected.paymentStatus} />
                      <VerifyPaymentButton
                        row={selected}
                        onDone={(patch) => patchRow(selected.id, patch)}
                      />
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Paid: {formatWhen(selected.paidAt) || '—'}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Attending photo
                    </div>
                    {selected.attendeeFrameUrl ? (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a
                          href={selected.attendeeFrameUrl}
                          download={`ecd-${selected.orderCode}-attending.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <EcdAttendeeFrameCard
                    orderCode={selected.orderCode}
                    existingUrl={selected.attendeeFrameUrl}
                    canEdit
                    onSaved={(url) => patchRow(selected.id, { attendeeFrameUrl: url })}
                  />
                </div>

                <div className="rounded-lg border border-neutral-200 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Venue access (QR → bracelet)
                    </div>
                    <VenueCheckInButton
                      row={selected}
                      onDone={(at) => patchRow(selected.id, { venueCheckedInAt: at })}
                    />
                  </div>
                  <p className="text-xs text-neutral-600">
                    One QR = one person on site. Bracelet allows venue presence; workshop rooms
                    need a reserved session below.
                  </p>
                </div>

                {selected.ticketType === 'fj' && (
                  <div>
                    <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Workshop reservations
                    </div>
                    {(selected.workshops || []).length === 0 ? (
                      <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-4 text-xs text-neutral-500">
                        No workshops reserved yet (buyer confirms on booking-confirmation).
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {(selected.workshops || []).map((w) => (
                          <WorkshopSessionRow
                            key={w.id}
                            workshop={w}
                            venueCheckedInAt={selected.venueCheckedInAt}
                            onCheckedIn={(id, at) => {
                              const workshops = (selected.workshops || []).map((ws) =>
                                ws.id === id ? { ...ws, sessionCheckedInAt: at } : ws,
                              );
                              patchRow(selected.id, { workshops });
                            }}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {selected.form && (
                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Checkout form
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      <div>Company: {selected.form.company || '—'}</div>
                      <div>Title: {selected.form.jobTitle || '—'}</div>
                      <div>Country: {selected.form.country || '—'}</div>
                      <div>Store: {selected.form.store || '—'}</div>
                      <div className="break-all">LinkedIn: {selected.form.linkedinUrl || '—'}</div>
                      <div className="break-all">Facebook: {selected.form.facebookUrl || '—'}</div>
                      <div className="sm:col-span-2">
                        Accessibility: {selected.form.accessibilityNeeds || '—'}
                      </div>
                      <div>News opt-in: {selected.form.newsOptIn ? 'Yes' : 'No'}</div>
                      {selected.form.needInvoice && (
                        <>
                          <div>Invoice co: {selected.form.invoiceCompany || '—'}</div>
                          <div>Tax ID: {selected.form.taxId || '—'}</div>
                          <div className="sm:col-span-2">
                            Billing: {selected.form.billingAddress || '—'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    Tickets · QR · email
                  </div>
                  <ul className="space-y-3">
                    {selected.tickets.map((t) => (
                      <TicketAdminCard
                        key={t.id}
                        ticket={t}
                        bookingPageUrl={
                          selected.bookingPageUrl ||
                          `${window.location.origin}/ecd/booking/${encodeURIComponent(selected.orderCode)}`
                        }
                        onUpdated={handleTicketUpdated}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default EcdRegistrationsPage;
