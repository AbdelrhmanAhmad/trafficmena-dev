import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fetchEvents } from '@/app/api/events';
import type { PromoCodeRecord } from '@/app/api/promoCodes';
import { fetchTracks } from '@/app/api/tracks';
import {
  useCreatePromoCode,
  useDeletePromoCode,
  usePromoCodes,
  useUpdatePromoCode,
} from '@/app/hooks/usePromoCodes';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
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
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { useErrorHandler } from '@/shared/utils/errorHandling';

const promoFormSchema = z
  .object({
    code: z.string().min(3).max(50),
    targetType: z.enum(['track', 'event']),
    targetId: z.string().uuid(),
    discountPercent: z.coerce.number().int().min(1).max(99),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: 'Start date must be before end date.',
    path: ['endsAt'],
  });

type PromoFormValues = z.infer<typeof promoFormSchema>;

type StatusFilter = 'all' | 'active' | 'upcoming' | 'expired';

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'expired', label: 'Expired' },
];

const formatLocalInput = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const formatDateRange = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
  const formatter = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
};

const getStatus = (promo: PromoCodeRecord) => {
  const now = Date.now();
  const start = new Date(promo.starts_at).getTime();
  const end = new Date(promo.ends_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'expired';
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
};

export default function AdminPromoCodes() {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { canDeleteContent } = useRolePermissions();
  const { data: promoCodes, isLoading } = usePromoCodes();
  const createPromoCodeMutation = useCreatePromoCode();
  const updatePromoCodeMutation = useUpdatePromoCode();
  const deletePromoCodeMutation = useDeletePromoCode();

  const { data: tracksData } = useQuery({
    queryKey: ['admin', 'promo-codes', 'tracks'],
    queryFn: () => fetchTracks({ page: 1, pageSize: 100 }),
    staleTime: 60 * 1000,
  });
  const { data: eventsData } = useQuery({
    queryKey: ['admin', 'promo-codes', 'events'],
    queryFn: () => fetchEvents({ page: 1, pageSize: 100 }),
    staleTime: 60 * 1000,
  });

  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeRecord | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<PromoCodeRecord | null>(null);
  const promoCodeId = useId();
  const discountId = useId();
  const startsAtId = useId();
  const endsAtId = useId();

  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: {
      code: '',
      targetType: 'track',
      targetId: '',
      discountPercent: 20,
      startsAt: '',
      endsAt: '',
    },
  });

  const targetType = form.watch('targetType');

  useEffect(() => {
    if (editingPromo) return;
    if (!targetType) return;
    form.setValue('targetId', '');
  }, [editingPromo, form, targetType]);

  const filteredPromos = useMemo(() => {
    const list = promoCodes ?? [];
    const query = searchValue.trim().toLowerCase();
    return list.filter((promo) => {
      const status = getStatus(promo);
      if (statusFilter !== 'all' && statusFilter !== status) return false;
      if (!query) return true;
      return (
        promo.code.toLowerCase().includes(query) || promo.target_name.toLowerCase().includes(query)
      );
    });
  }, [promoCodes, searchValue, statusFilter]);

  const openCreate = () => {
    setEditingPromo(null);
    form.reset({
      code: '',
      targetType: 'track',
      targetId: '',
      discountPercent: 20,
      startsAt: '',
      endsAt: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (promo: PromoCodeRecord) => {
    setEditingPromo(promo);
    form.reset({
      code: promo.code,
      targetType: promo.target_type,
      targetId: promo.target_id,
      discountPercent: promo.discount_percent,
      startsAt: formatLocalInput(promo.starts_at),
      endsAt: formatLocalInput(promo.ends_at),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: PromoFormValues) => {
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        targetType: values.targetType,
        targetId: values.targetId,
        discountPercent: Number(values.discountPercent),
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
      };

      if (editingPromo) {
        await updatePromoCodeMutation.mutateAsync({
          id: editingPromo.id,
          payload: {
            discountPercent: payload.discountPercent,
            startsAt: payload.startsAt,
            endsAt: payload.endsAt,
          },
        });
        toast({
          title: 'Promo code updated',
          description: `Updated ${editingPromo.code}.`,
        });
      } else {
        await createPromoCodeMutation.mutateAsync(payload);
        toast({
          title: 'Promo code created',
          description: `Created ${payload.code}.`,
        });
      }

      setIsModalOpen(false);
    } catch (error) {
      const appError = handleError(error, 'Unable to save promo code.');
      toast({
        title: 'Save failed',
        description: appError.message,
        variant: 'destructive',
      });
    }
  };

  const targetOptions = useMemo(() => {
    if (targetType === 'event') {
      return (eventsData?.items ?? []).map((event) => ({
        id: event.id,
        label: event.title,
      }));
    }
    return (tracksData?.items ?? []).map((track) => ({
      id: track.id,
      label: track.title,
    }));
  }, [eventsData?.items, targetType, tracksData?.items]);

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50">
                <Tag className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">Promo Codes</h1>
                <p className="text-neutral-600">
                  Create and manage discount codes for tracks and standalone events.
                </p>
              </div>
            </div>
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Create code
            </Button>
          </div>

          <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)]">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-2 md:flex-row">
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search by code or target"
                    className="h-9 rounded-lg"
                  />
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg md:w-48">
                      <SelectValue placeholder="Filter status" />
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

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Code</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Valid</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-neutral-500">
                          Loading promo codes...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredPromos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-neutral-500">
                          No promo codes found.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredPromos.map((promo) => {
                      const status = getStatus(promo);
                      return (
                        <TableRow key={promo.id}>
                          <TableCell className="font-semibold text-neutral-900">
                            {promo.code}
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {promo.target_type === 'track' ? 'Track' : 'Event'}: {promo.target_name}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {promo.discount_percent}%
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {formatDateRange(promo.starts_at, promo.ends_at)}
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {promo.usage_count}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={status === 'active' ? 'default' : 'secondary'}
                              className={
                                status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : status === 'upcoming'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-neutral-200 text-neutral-600'
                              }
                            >
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(promo)}
                                className="rounded-lg"
                              >
                                Edit
                              </Button>
                              {canDeleteContent && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-rose-600 hover:text-rose-700"
                                  onClick={() => setDeletePrompt(promo)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
              <DialogDescription>
                {editingPromo
                  ? 'Adjust the discount or validity window.'
                  : 'Create a code for a single track or standalone event.'}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor={promoCodeId}>Code</Label>
                <Input
                  id={promoCodeId}
                  placeholder="SUMMER25"
                  disabled={Boolean(editingPromo)}
                  {...form.register('code')}
                />
                {form.formState.errors.code && (
                  <p className="text-xs text-rose-600">{form.formState.errors.code.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target type</Label>
                  <Select
                    value={targetType}
                    onValueChange={(value) =>
                      form.setValue('targetType', value as 'track' | 'event')
                    }
                    disabled={Boolean(editingPromo)}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="track">Track</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.targetType && (
                    <p className="text-xs text-rose-600">
                      {form.formState.errors.targetType.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Select
                    value={form.watch('targetId')}
                    onValueChange={(value) => form.setValue('targetId', value)}
                    disabled={Boolean(editingPromo)}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue
                        placeholder={targetType === 'track' ? 'Select track' : 'Select event'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {targetOptions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No {targetType}s available
                        </SelectItem>
                      ) : (
                        targetOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.targetId && (
                    <p className="text-xs text-rose-600">
                      {form.formState.errors.targetId.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={discountId}>Discount (%)</Label>
                  <Input
                    id={discountId}
                    type="number"
                    min={1}
                    max={99}
                    {...form.register('discountPercent')}
                  />
                  {form.formState.errors.discountPercent && (
                    <p className="text-xs text-rose-600">
                      {form.formState.errors.discountPercent.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={startsAtId}>Starts at</Label>
                  <Input id={startsAtId} type="datetime-local" {...form.register('startsAt')} />
                  {form.formState.errors.startsAt && (
                    <p className="text-xs text-rose-600">
                      {form.formState.errors.startsAt.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={endsAtId}>Ends at</Label>
                <Input id={endsAtId} type="datetime-local" {...form.register('endsAt')} />
                {form.formState.errors.endsAt && (
                  <p className="text-xs text-rose-600">{form.formState.errors.endsAt.message}</p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPromoCodeMutation.isPending || updatePromoCodeMutation.isPending}
                >
                  {editingPromo ? 'Save changes' : 'Create code'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(deletePrompt)}
          onOpenChange={(open) => !open && setDeletePrompt(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this promo code?</DialogTitle>
              <DialogDescription>
                {deletePrompt?.code} will be disabled immediately. Existing paid payments remain
                unchanged.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeletePrompt(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!deletePrompt) return;
                  deletePromoCodeMutation.mutate(deletePrompt.id, {
                    onSuccess: () => {
                      toast({
                        title: 'Promo code deleted',
                        description: `${deletePrompt.code} has been disabled.`,
                      });
                      setDeletePrompt(null);
                    },
                    onError: (error) => {
                      const appError = handleError(error, 'Unable to delete promo code.');
                      toast({
                        title: 'Delete failed',
                        description: appError.message,
                        variant: 'destructive',
                      });
                      setDeletePrompt(null);
                    },
                  });
                }}
                disabled={deletePromoCodeMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AdminProtectedRoute>
  );
}
