import { Package, Plus, Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEcdPackages,
  updateEcdPackage,
  type EcdPackageFeature,
  type EcdTicketPackage,
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
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/custom/use-toast';

type DraftFeature = {
  kind: 'included' | 'excluded';
  label: string;
  emphasis: boolean;
};

type PackageDraft = {
  displayName: string;
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  badge: string;
  ctaLabel: string;
  priceEgp: number;
  features: DraftFeature[];
};

function toDraft(pkg: EcdTicketPackage): PackageDraft {
  return {
    displayName: pkg.displayName,
    eyebrow: pkg.eyebrow,
    title: pkg.title,
    tagline: pkg.tagline,
    description: pkg.description,
    badge: pkg.badge || '',
    ctaLabel: pkg.ctaLabel,
    priceEgp: pkg.priceEgp,
    features: pkg.features.map((f: EcdPackageFeature) => ({
      kind: f.kind,
      label: f.label,
      emphasis: f.emphasis,
    })),
  };
}

function PackageEditor({
  ticketType,
  pkg,
}: {
  ticketType: 'ct' | 'fj';
  pkg: EcdTicketPackage;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => toDraft(pkg));

  useEffect(() => {
    setDraft(toDraft(pkg));
  }, [pkg]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateEcdPackage(ticketType, {
        displayName: draft.displayName.trim(),
        eyebrow: draft.eyebrow.trim(),
        title: draft.title.trim(),
        tagline: draft.tagline.trim(),
        description: draft.description.trim(),
        badge: draft.badge.trim() || null,
        ctaLabel: draft.ctaLabel.trim(),
        priceEgp: draft.priceEgp,
        features: draft.features
          .filter((f) => f.label.trim())
          .map((f, i) => ({
            kind: f.kind,
            label: f.label.trim(),
            emphasis: f.emphasis,
            sortOrder: i,
          })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-packages'] });
      toast({ title: `${draft.displayName} saved` });
    },
    onError: () => {
      toast({ title: 'Save failed', variant: 'destructive' });
    },
  });

  const setField = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <span>
            {draft.displayName}{' '}
            <span className="font-mono text-xs text-neutral-500">({ticketType})</span>
          </span>
          <span className="text-sm font-normal text-neutral-500">
            Key fixed — edit only
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Display name</Label>
            <Input
              value={draft.displayName}
              onChange={(e) => setField('displayName', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Eyebrow</Label>
            <Input value={draft.eyebrow} onChange={(e) => setField('eyebrow', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setField('title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tagline</Label>
            <Input value={draft.tagline} onChange={(e) => setField('tagline', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Price (EGP)</Label>
            <Input
              type="number"
              min={1}
              value={draft.priceEgp}
              onChange={(e) => setField('priceEgp', Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Badge (optional)</Label>
            <Input
              value={draft.badge}
              onChange={(e) => setField('badge', e.target.value)}
              placeholder="e.g. Complete Access"
            />
          </div>
          <div className="space-y-1">
            <Label>CTA label</Label>
            <Input value={draft.ctaLabel} onChange={(e) => setField('ctaLabel', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-3">
          <div className="flex items-center justify-between">
            <Label>Features</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  features: [...d.features, { kind: 'included', label: '', emphasis: false }],
                }))
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              Add row
            </Button>
          </div>
          {draft.features.map((f, idx) => (
            <div key={`f-${ticketType}-${idx}`} className="flex flex-wrap items-center gap-2">
              <Select
                value={f.kind}
                onValueChange={(v: 'included' | 'excluded') => {
                  setDraft((d) => {
                    const next = [...d.features];
                    next[idx] = { ...next[idx], kind: v };
                    return { ...d, features: next };
                  });
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">Included</SelectItem>
                  <SelectItem value="excluded">Excluded</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="min-w-[180px] flex-1"
                value={f.label}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft((d) => {
                    const next = [...d.features];
                    next[idx] = { ...next[idx], label: value };
                    return { ...d, features: next };
                  });
                }}
                placeholder="Feature label"
              />
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={f.emphasis}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDraft((d) => {
                      const next = [...d.features];
                      next[idx] = { ...next[idx], emphasis: checked };
                      return { ...d, features: next };
                    });
                  }}
                />
                Bold
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove feature"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    features: d.features.filter((_, i) => i !== idx),
                  }))
                }
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          disabled={saveMutation.isPending || !draft.displayName.trim() || draft.priceEgp <= 0}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save package'}
        </Button>
      </CardContent>
    </Card>
  );
}

const EcdPackagesPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'ecd-packages'],
    queryFn: fetchEcdPackages,
  });

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6 p-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900">
              <Package className="h-6 w-6" />
              ECD Packages
            </h1>
            <p className="text-sm text-neutral-600">
              Exactly two passes (<code className="text-xs">ct</code> /{' '}
              {/* <code className="text-xs">fj</code>). Edit names, prices, and features — no third */}
              package.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : error || !data?.ct || !data?.fj ? (
            <Card>
              <CardContent className="py-8 text-sm text-neutral-600">
                Packages not seeded. On the server run:{' '}
                <code className="text-xs">node scripts/seed-ecd-content.mjs</code>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <PackageEditor ticketType="ct" pkg={data.ct} />
              <PackageEditor ticketType="fj" pkg={data.fj} />
            </div>
          )}
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default EcdPackagesPage;
