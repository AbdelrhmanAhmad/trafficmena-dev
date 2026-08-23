import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getCsrfHeaders } from '@/app/api/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

const API_BASE = '/api';

async function callFactoryReset(code: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/factory-reset`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Reset failed.');
  }
}

export function FactoryResetCard() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleReset = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setIsPending(true);
    try {
      await callFactoryReset(code);
      toast({
        title: 'Database reset complete',
        description: 'All data has been wiped. Admin account re-created. Please log in again.',
      });
      // Force full reload so stale auth state is cleared
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        variant: 'destructive',
      });
      setConfirmed(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-[28px] border border-red-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-red-700">Factory Reset</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Wipes all data and re-creates the default admin account. This action is irreversible.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-code">Reset code</Label>
          <Input
            id="reset-code"
            type="password"
            placeholder="Enter reset code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setConfirmed(false);
            }}
            disabled={isPending}
            className="max-w-xs"
          />
        </div>

        {confirmed && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Warning:</strong> This will permanently delete all events, tracks, series,
            users, payments, and all other data. Click the button again to confirm.
          </div>
        )}

        <Button
          type="button"
          variant="destructive"
          disabled={isPending || code.trim().length === 0}
          onClick={handleReset}
          className="rounded-xl"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting…
            </>
          ) : confirmed ? (
            'Confirm — Wipe all data'
          ) : (
            'Reset database'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
