import { Mail, Search, Ticket } from 'lucide-react';
import * as QRCode from 'qrcode';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEcdRegistrations,
  sendEcdTicketEmail,
  updateEcdTicketEmail,
  type EcdRegistrationListItem,
  type EcdTicketRow,
} from '@/app/api/ecd';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/custom/use-toast';

function StatusBadge({ status }: { status: string }) {
  let className = 'bg-neutral-100 text-neutral-700';
  if (status === 'paid') className = 'bg-emerald-100 text-emerald-800';
  if (status === 'pending') className = 'bg-amber-100 text-amber-800';
  if (status === 'failed' || status === 'expired' || status === 'cancelled') {
    className = 'bg-red-100 text-red-800';
  }
  return <Badge className={className}>{status}</Badge>;
}

function TicketQr({ serial }: { serial: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(serial, {
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
  }, [serial]);

  if (!src) {
    return <div className="h-40 w-40 animate-pulse rounded-lg bg-neutral-100" />;
  }

  return (
    <img
      src={src}
      alt={`QR ${serial}`}
      className="h-40 w-40 rounded-lg border border-neutral-200 bg-white p-1"
    />
  );
}

function TicketAdminCard({
  ticket,
  onUpdated,
}: {
  ticket: EcdTicketRow;
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
        <TicketQr serial={ticket.serial} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="font-medium text-neutral-900">{ticket.attendeeName}</div>
          <div className="font-mono text-[11px] break-all text-neutral-600">{ticket.serial}</div>
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

const EcdRegistrationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [ticketType, setTicketType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EcdRegistrationListItem | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'ecd-registrations', search, ticketType, status, page],
    queryFn: () =>
      fetchEcdRegistrations({
        q: search || undefined,
        ticketType: ticketType === 'all' ? undefined : ticketType,
        status: status === 'all' ? undefined : status,
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
    return { paid, shown: items.length, total };
  }, [items, total]);

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
    void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-registrations'] });
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">ECD Registrations</h1>
              <p className="mt-1 text-sm text-neutral-600">
                ECommerce Day 2026 HTML checkout bookings (removable module).
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Ticket className="h-3.5 w-3.5" />
              {summary.total} total · {summary.paid} paid on this page
            </Badge>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Search & filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  className="pl-9"
                  placeholder="Order, email, name, serial…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      setSearch(q.trim());
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
                  <SelectItem value="ct">Control Tower</SelectItem>
                  <SelectItem value="fj">Full Journey</SelectItem>
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
              <Button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSearch(q.trim());
                }}
              >
                Search
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Buyer</th>
                    <th className="px-4 py-3 font-medium">Package</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Serials</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                        Loading registrations…
                      </td>
                    </tr>
                  )}
                  {query.isError && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                        Failed to load ECD registrations.
                      </td>
                    </tr>
                  )}
                  {!query.isLoading && !query.isError && items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                        No registrations found.
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-neutral-50/80">
                      <td className="px-4 py-3 font-mono text-xs">{row.orderCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{row.buyerName}</div>
                        <div className="text-xs text-neutral-500">{row.buyerEmail}</div>
                      </td>
                      <td className="px-4 py-3">{row.ticketName}</td>
                      <td className="px-4 py-3">{row.qty}</td>
                      <td className="px-4 py-3">{row.amountFormatted}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-neutral-600">
                        {row.serials.slice(0, 2).join(', ')}
                        {row.serials.length > 2 ? ` +${row.serials.length - 2}` : ''}
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
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{selected?.orderCode}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Buyer</div>
                  <div className="font-medium">{selected.buyerName}</div>
                  <div>{selected.buyerEmail}</div>
                  <div>{selected.buyerMobile}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Package</div>
                  <div>
                    {selected.ticketName} × {selected.qty} — {selected.amountFormatted}
                  </div>
                  <div>Status: {selected.paymentStatus}</div>
                  {selected.promoCode && <div>Promo: {selected.promoCode}</div>}
                </div>
                {selected.form && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500">HTML form</div>
                    <div>Company: {selected.form.company || '—'}</div>
                    <div>Title: {selected.form.jobTitle || '—'}</div>
                    <div>Country: {selected.form.country || '—'}</div>
                    {selected.form.needInvoice && (
                      <>
                        <div>Invoice co: {selected.form.invoiceCompany || '—'}</div>
                        <div>Tax ID: {selected.form.taxId || '—'}</div>
                        <div>Billing: {selected.form.billingAddress || '—'}</div>
                      </>
                    )}
                  </div>
                )}
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                    Tickets · QR · email
                  </div>
                  <ul className="space-y-3">
                    {selected.tickets.map((t) => (
                      <TicketAdminCard key={t.id} ticket={t} onUpdated={handleTicketUpdated} />
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
