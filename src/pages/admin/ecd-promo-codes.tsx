import { Percent, Plus, Trash2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEcdPromoCode,
  deleteEcdPromoCode,
  fetchEcdPromoCodes,
  updateEcdPromoCode,
  type EcdPromoAppliesTo,
  type EcdPromoCode,
  type EcdPromoCodeInput,
} from '@/app/api/ecd';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
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
import { useToast } from '@/shared/hooks/custom/use-toast';

type Draft = {
  code: string;
  discountPercent: string;
  appliesTo: EcdPromoAppliesTo;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
};

const emptyDraft = (): Draft => ({
  code: '',
  discountPercent: '10',
  appliesTo: 'all',
  startsAt: '',
  endsAt: '',
  maxRedemptions: '',
});

function toInput(draft: Draft): EcdPromoCodeInput {
  return {
    code: draft.code.trim().toUpperCase(),
    discountPercent: Number(draft.discountPercent),
    appliesTo: draft.appliesTo,
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    maxRedemptions: draft.maxRedemptions.trim()
      ? Number(draft.maxRedemptions)
      : null,
  };
}

function toDraft(row: EcdPromoCode): Draft {
  return {
    code: row.code,
    discountPercent: String(row.discountPercent),
    appliesTo: row.appliesTo,
    startsAt: row.startsAt ? row.startsAt.slice(0, 16) : '',
    endsAt: row.endsAt ? row.endsAt.slice(0, 16) : '',
    maxRedemptions: row.maxRedemptions != null ? String(row.maxRedemptions) : '',
  };
}

function PromoForm({
  draft,
  setDraft,
  onSubmit,
  submitLabel,
  busy,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="ecd-promo-code">Code</Label>
        <Input
          id="ecd-promo-code"
          value={draft.code}
          onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
          placeholder="LAUNCH"
          className="font-mono uppercase"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ecd-promo-pct">Discount %</Label>
        <Input
          id="ecd-promo-pct"
          type="number"
          min={1}
          max={100}
          value={draft.discountPercent}
          onChange={(e) => setDraft((d) => ({ ...d, discountPercent: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Applies to</Label>
        <Select
          value={draft.appliesTo}
          onValueChange={(v: EcdPromoAppliesTo) => setDraft((d) => ({ ...d, appliesTo: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tickets</SelectItem>
            <SelectItem value="ct">Control Tower only</SelectItem>
            <SelectItem value="fj">Full Journey only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ecd-promo-max">Max redemptions (paid)</Label>
        <Input
          id="ecd-promo-max"
          type="number"
          min={1}
          value={draft.maxRedemptions}
          onChange={(e) => setDraft((d) => ({ ...d, maxRedemptions: e.target.value }))}
          placeholder="Unlimited"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ecd-promo-start">Starts at (optional)</Label>
        <Input
          id="ecd-promo-start"
          type="datetime-local"
          value={draft.startsAt}
          onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ecd-promo-end">Ends at (optional)</Label>
        <Input
          id="ecd-promo-end"
          type="datetime-local"
          value={draft.endsAt}
          onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="button" onClick={onSubmit} disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function EcdPromoCodesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDraft, setCreateDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const query = useQuery({
    queryKey: ['ecd-promo-codes'],
    queryFn: fetchEcdPromoCodes,
  });

  const createMutation = useMutation({
    mutationFn: () => createEcdPromoCode(toInput(createDraft)),
    onSuccess: () => {
      toast({ title: 'Promo created' });
      setCreateDraft(emptyDraft());
      queryClient.invalidateQueries({ queryKey: ['ecd-promo-codes'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Create failed', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('No promo selected');
      return updateEcdPromoCode(editingId, toInput(editDraft));
    },
    onSuccess: () => {
      toast({ title: 'Promo updated' });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['ecd-promo-codes'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEcdPromoCode(id),
    onSuccess: () => {
      toast({ title: 'Promo deleted' });
      queryClient.invalidateQueries({ queryKey: ['ecd-promo-codes'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  const items = query.data?.items || [];

  return (
    <AppLayout variant="admin">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            ECD Promo Codes
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Percent discounts for ECommerce Day HTML checkout. Applied on session create and
            stored on each registration.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              New promo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PromoForm
              draft={createDraft}
              setDraft={setCreateDraft}
              onSubmit={() => createMutation.mutate()}
              submitLabel={createMutation.isPending ? 'Saving…' : 'Create promo'}
              busy={createMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" />
              Active codes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {query.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
            {query.isError && (
              <p className="text-sm text-red-600">Failed to load ECD promo codes.</p>
            )}
            {!query.isLoading && items.length === 0 && (
              <p className="text-sm text-neutral-500">No promo codes yet.</p>
            )}
            {items.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-neutral-200 p-4"
              >
                {editingId === row.id ? (
                  <PromoForm
                    draft={editDraft}
                    setDraft={setEditDraft}
                    onSubmit={() => updateMutation.mutate()}
                    submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
                    busy={updateMutation.isPending}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-semibold text-neutral-900">
                        {row.code}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {row.discountPercent}% off · applies to{' '}
                        {row.appliesTo === 'all'
                          ? 'all tickets'
                          : row.appliesTo === 'ct'
                            ? 'Control Tower'
                            : 'Full Journey'}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Used (paid): {row.redemptionCount}
                        {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ' · unlimited'}
                        {row.startsAt ? ` · from ${new Date(row.startsAt).toLocaleString()}` : ''}
                        {row.endsAt ? ` · until ${new Date(row.endsAt).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(row.id);
                          setEditDraft(toDraft(row));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete promo ${row.code}?`)) {
                            deleteMutation.mutate(row.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {editingId === row.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function AdminEcdPromoCodesPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <EcdPromoCodesPage />
    </AdminProtectedRoute>
  );
}
