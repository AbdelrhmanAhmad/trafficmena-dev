import { ClipboardList, Search } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEcdSponsorInquiries,
  updateEcdSponsorInquiry,
  type EcdSponsorInquiry,
  type EcdSponsorInquiryStatus,
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
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/custom/use-toast';

const STATUS_LABEL: Record<EcdSponsorInquiryStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  in_progress: 'In Progress',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

function StatusBadge({ status }: { status: EcdSponsorInquiryStatus }) {
  let className = 'bg-neutral-100 text-neutral-700';
  if (status === 'new') className = 'bg-sky-100 text-sky-800';
  if (status === 'reviewed') className = 'bg-violet-100 text-violet-800';
  if (status === 'in_progress') className = 'bg-amber-100 text-amber-900';
  if (status === 'accepted') className = 'bg-emerald-100 text-emerald-800';
  if (status === 'rejected') className = 'bg-red-100 text-red-800';
  return <Badge className={className}>{STATUS_LABEL[status]}</Badge>;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
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

const EcdSponsorInquiriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EcdSponsorInquiry | null>(null);
  const [editStatus, setEditStatus] = useState<EcdSponsorInquiryStatus>('new');
  const [adminNotes, setAdminNotes] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'ecd-sponsor-inquiries', search, status, page],
    queryFn: () =>
      fetchEcdSponsorInquiries({
        q: search || undefined,
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
    const neu = items.filter((i) => i.status === 'new').length;
    return { neu, shown: items.length, total };
  }, [items, total]);

  const openDetails = (row: EcdSponsorInquiry) => {
    setSelected(row);
    setEditStatus(row.status);
    setAdminNotes(row.adminNotes || '');
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No inquiry selected');
      return updateEcdSponsorInquiry(selected.id, {
        status: editStatus,
        adminNotes: adminNotes.trim() || null,
      });
    },
    onSuccess: (inquiry) => {
      setSelected(inquiry);
      toast({ title: 'Inquiry updated', description: STATUS_LABEL[inquiry.status] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-sponsor-inquiries'] });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Could not save review status.',
        variant: 'destructive',
      });
    },
  });

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">ECD Partnership Inquiries</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Submissions from become-a-sponsor.html (review workflow).
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              {summary.total} total · {summary.neu} new on this page
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
                  placeholder="Request, company, email, name…"
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
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                    <th className="px-4 py-3 font-medium">Request</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                        Loading inquiries…
                      </td>
                    </tr>
                  )}
                  {query.isError && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-red-600">
                        Failed to load inquiries.
                      </td>
                    </tr>
                  )}
                  {!query.isLoading && !query.isError && items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                        No partnership inquiries found.
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-neutral-50/80">
                      <td className="px-4 py-3 font-mono text-xs">{row.requestCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{row.company}</div>
                        <div className="text-xs text-neutral-500">
                          {row.sector} · {row.country}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.contactName}</div>
                        <div className="text-xs text-neutral-500">{row.contactEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{row.interestedLevel}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        {formatWhen(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openDetails(row)}
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
              <DialogTitle className="font-mono text-base">{selected?.requestCode}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-5 text-sm">
                <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Company
                    </div>
                    <div className="mt-1 font-medium">{selected.company}</div>
                    <div>{selected.website || '—'}</div>
                    <div className="text-neutral-600">
                      {selected.sector} · {selected.country} · {selected.companySize}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Contact
                    </div>
                    <div className="mt-1 font-medium">{selected.contactName}</div>
                    <div>{selected.contactTitle}</div>
                    <div>{selected.contactEmail}</div>
                    <div>{selected.contactPhone || '—'}</div>
                    <div className="text-xs text-neutral-500">
                      Prefer: {selected.preferredContact}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 p-4">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    Brief
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-neutral-500">Level:</span> {selected.interestedLevel}
                    </div>
                    <div>
                      <span className="text-neutral-500">Objectives:</span>{' '}
                      {(selected.objectives || []).join(', ') || '—'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Properties:</span>{' '}
                      {(selected.interestedProperties || []).join(', ') || '—'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Audience:</span>{' '}
                      {selected.targetAudience || '—'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Timing:</span> {selected.timing || '—'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Budget:</span> {selected.budgetBand || '—'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Notes:</span> {selected.notes || '—'}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Submitted {formatWhen(selected.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    Review
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ecd-inq-status">Status</Label>
                    <Select
                      value={editStatus}
                      onValueChange={(v) => setEditStatus(v as EcdSponsorInquiryStatus)}
                    >
                      <SelectTrigger id="ecd-inq-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ecd-inq-notes">Admin notes</Label>
                    <Textarea
                      id="ecd-inq-notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save review'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default EcdSponsorInquiriesPage;
