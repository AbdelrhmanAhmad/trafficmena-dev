import {
  Check,
  CheckCircle2,
  DoorOpen,
  Lock,
  Ticket,
  UserCheck,
} from 'lucide-react';
import * as QRCode from 'qrcode';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import {
  fetchEcdPortalBooking,
  fetchEcdPublicWorkshops,
  requestEcdPortalOtp,
  saveEcdPortalWorkshops,
  sessionCheckInEcdWorkshop,
  venueCheckInEcdPortal,
  verifyEcdPortalOtp,
  type EcdPortalWorkshopOption,
} from '@/app/api/ecd';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { cn } from '@/shared/lib/utils';

const TRACK_META: Record<number, { label: string; text: string; dot: string }> = {
  2: { label: 'CLICKED', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  3: { label: 'CONFIRMED', text: 'text-cyan-800', dot: 'bg-cyan-700' },
  4: { label: 'DELIVERED', text: 'text-amber-700', dot: 'bg-amber-400' },
};

function seatBadgeClass(status: string) {
  if (status === 'Few Seats') {
    return 'border-amber-300 bg-amber-50 text-amber-800';
  }
  if (status === 'Fully Booked') {
    return 'border-neutral-200 bg-neutral-100 text-neutral-500';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function editTokenKey(orderCode: string) {
  return `ecd2026_portal_edit:${orderCode}`;
}

function loadEditToken(orderCode: string) {
  try {
    return sessionStorage.getItem(editTokenKey(orderCode)) || '';
  } catch {
    return '';
  }
}

function saveEditToken(orderCode: string, token: string) {
  try {
    sessionStorage.setItem(editTokenKey(orderCode), token);
  } catch {
    // ignore
  }
}

function clearEditToken(orderCode: string) {
  try {
    sessionStorage.removeItem(editTokenKey(orderCode));
  } catch {
    // ignore
  }
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

function timeSortKey(t: string) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 9999;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h >= 1 && h <= 10) h += 12;
  return h * 60 + min;
}

function PortalQr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 200,
      color: { dark: '#101010', light: '#FFFFFF' },
    }).then((u) => {
      if (!cancelled) setSrc(u);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!src) return <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-neutral-100" />;
  return (
    <img
      src={src}
      alt="Booking QR"
      className="h-[200px] w-[200px] rounded-lg border border-neutral-200 bg-white p-1"
    />
  );
}

const EcdBookingPortalPage: React.FC = () => {
  const { orderCode: rawCode } = useParams<{ orderCode: string }>();
  const orderCode = decodeURIComponent(rawCode || '');
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'done'>('idle');
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [editToken, setEditToken] = useState(() => (orderCode ? loadEditToken(orderCode) : ''));

  useEffect(() => {
    if (orderCode) setEditToken(loadEditToken(orderCode));
  }, [orderCode]);

  const bookingQuery = useQuery({
    queryKey: ['ecd-portal', orderCode, user?.id, editToken || 'none'],
    queryFn: () => fetchEcdPortalBooking(orderCode, editToken || null),
    enabled: !!orderCode,
  });

  const workshopsQuery = useQuery({
    queryKey: ['ecd-public-workshops'],
    queryFn: fetchEcdPublicWorkshops,
    enabled: !!bookingQuery.data && bookingQuery.data.ticketType === 'fj',
  });

  const booking = bookingQuery.data;

  useEffect(() => {
    if (!booking) return;
    if (booking.canEdit) setOtpStep('done');
    const next: Record<string, string> = {};
    for (const w of booking.workshops || []) {
      next[w.timeLabel] = w.slug;
    }
    setSelection(next);
  }, [booking?.bookingId, booking?.canEdit, booking?.workshops]);

  const slots = useMemo(() => {
    const list = (workshopsQuery.data || []).filter((w) => w.fullJourneyOnly && w.trackIndex >= 2);
    const times = [...new Set(list.map((w) => w.timeLabel))].sort(
      (a, b) => timeSortKey(a) - timeSortKey(b),
    );
    return times.map((time, idx) => ({
      slotIndex: idx + 1,
      timeLabel: time,
      options: list
        .filter((w) => w.timeLabel === time)
        .sort((a, b) => a.trackIndex - b.trackIndex),
    }));
  }, [workshopsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveEcdPortalWorkshops(
        orderCode,
        Object.values(selection).filter(Boolean),
        editToken || null,
      ),
    onSuccess: () => {
      toast({ title: 'Workshops saved' });
      setEditMode(false);
      void queryClient.invalidateQueries({ queryKey: ['ecd-portal', orderCode] });
      void queryClient.invalidateQueries({ queryKey: ['ecd-public-workshops'] });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not save workshops.';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
      if (err instanceof ApiError && err.code === 'OTP_REQUIRED') {
        clearEditToken(orderCode);
        setEditToken('');
        setOtpStep('idle');
        setEditMode(false);
      }
    },
  });

  const venueMutation = useMutation({
    mutationFn: () => venueCheckInEcdPortal(orderCode),
    onSuccess: (data) => {
      toast({
        title: data.alreadyCheckedIn ? 'Already checked in' : 'Venue check-in recorded',
      });
      void queryClient.invalidateQueries({ queryKey: ['ecd-portal', orderCode] });
    },
    onError: () => {
      toast({
        title: 'Check-in failed',
        description: 'Staff session required.',
        variant: 'destructive',
      });
    },
  });

  const sessionMutation = useMutation({
    mutationFn: (reservationId: string) => sessionCheckInEcdWorkshop(reservationId),
    onSuccess: (data) => {
      toast({
        title: data.alreadyCheckedIn ? 'Already in session' : 'Room entry recorded',
      });
      void queryClient.invalidateQueries({ queryKey: ['ecd-portal', orderCode] });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Session check-in failed.';
      toast({ title: 'Failed', description: message, variant: 'destructive' });
    },
  });

  const startOtp = async () => {
    if (!orderCode) return;
    setOtpBusy(true);
    try {
      const result = await requestEcdPortalOtp(orderCode);
      setOtpStep('sent');
      toast({
        title: 'Check your inbox',
        description: `We sent a code to ${result.maskedEmail}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send code.';
      toast({ title: 'OTP failed', description: message, variant: 'destructive' });
    } finally {
      setOtpBusy(false);
    }
  };

  const confirmOtp = async () => {
    if (!orderCode || !otp.trim()) return;
    setOtpBusy(true);
    try {
      const result = await verifyEcdPortalOtp(orderCode, otp.trim());
      saveEditToken(orderCode, result.editToken);
      setEditToken(result.editToken);
      setOtpStep('done');
      setEditMode(true);
      toast({ title: 'Verified', description: 'You can edit workshops now.' });
      void queryClient.invalidateQueries({ queryKey: ['ecd-portal', orderCode] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid code.';
      toast({ title: 'Verification failed', description: message, variant: 'destructive' });
    } finally {
      setOtpBusy(false);
    }
  };

  const beginEdit = () => {
    if (booking?.canEdit) {
      setEditMode(true);
      return;
    }
    setEditMode(false);
    void startOtp();
  };

  const pickWorkshop = (timeLabel: string, option: EcdPortalWorkshopOption) => {
    if (!option.available && selection[timeLabel] !== option.slug) return;
    setSelection((prev) => {
      const next = { ...prev };
      if (next[timeLabel] === option.slug) delete next[timeLabel];
      else next[timeLabel] = option.slug;
      return next;
    });
  };

  if (!orderCode) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-600">
          Missing booking code.
        </div>
      </Layout>
    );
  }

  if (bookingQuery.isLoading || authLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-500">
          Loading booking…
        </div>
      </Layout>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Booking not found</h1>
          <p className="mt-2 text-sm text-neutral-600">
            This invite link is invalid or the payment is not confirmed yet.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600">
              ECommerce Day 2026
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">
              {booking.event.title}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {formatWhen(booking.event.startIso)} · {booking.event.location}
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Ticket className="h-3.5 w-3.5" />
            {booking.ticketName}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Booking</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-500">Order</span>
                <div className="font-mono text-xs break-all">{booking.orderCode}</div>
              </div>
              <div>
                <span className="text-neutral-500">Buyer</span>
                <div className="font-medium">{booking.buyerName}</div>
                <div>{booking.buyerEmail}</div>
                <div>{booking.buyerMobile || '—'}</div>
              </div>
              <div>
                <span className="text-neutral-500">Paid</span>
                <div>{formatWhen(booking.paidAt)}</div>
                <div className="font-medium">{booking.amountFormatted}</div>
              </div>
              {booking.venueCheckedInAt ? (
                <Badge className="gap-1 bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  On site · {formatWhen(booking.venueCheckedInAt)}
                </Badge>
              ) : (
                <Badge variant="outline">Not checked in at venue</Badge>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <PortalQr url={booking.bookingPageUrl} />
              <p className="max-w-[200px] text-center font-mono text-[10px] break-all text-neutral-500">
                {booking.bookingPageUrl}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {booking.tickets.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  <div className="font-medium">{t.attendeeName}</div>
                  <div className="font-mono text-[11px] break-all text-neutral-600">{t.serial}</div>
                  <div className="text-xs text-neutral-500">{t.attendeeEmail}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {booking.canCheckIn && (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Staff · door day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                disabled={!!booking.venueCheckedInAt || venueMutation.isPending}
                onClick={() => venueMutation.mutate()}
              >
                <UserCheck className="mr-1.5 h-4 w-4" />
                {booking.venueCheckedInAt ? 'Venue checked in' : 'Mark present (bracelet)'}
              </Button>
              {(booking.workshops || []).length > 0 && (
                <ul className="space-y-2">
                  {booking.workshops.map((w) => (
                    <li
                      key={w.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-mono text-[10px] uppercase text-neutral-500">
                          {TRACK_META[w.trackIndex]?.label || `Track ${w.trackIndex}`} ·{' '}
                          {w.timeLabel}
                        </div>
                        <div className="font-medium">{w.title}</div>
                      </div>
                      {w.sessionCheckedInAt ? (
                        <Badge className="gap-1 bg-emerald-100 text-emerald-800">
                          <DoorOpen className="h-3.5 w-3.5" />
                          Entered
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!booking.venueCheckedInAt || sessionMutation.isPending}
                          onClick={() => sessionMutation.mutate(w.id)}
                        >
                          <DoorOpen className="mr-1.5 h-3.5 w-3.5" />
                          Enter room
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {booking.ticketType === 'fj' && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Workshop sessions</CardTitle>
              {!editMode ? (
                <Button type="button" size="sm" variant="outline" onClick={beginEdit}>
                  {booking.canEdit ? 'Edit workshops' : 'Verify email to edit'}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      const next: Record<string, string> = {};
                      for (const w of booking.workshops || []) next[w.timeLabel] = w.slug;
                      setSelection(next);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save workshops'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!booking.canEdit && otpStep !== 'done' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-amber-900">
                    <Lock className="h-4 w-4" />
                    Verify buyer email to change sessions
                  </div>
                  <p className="mb-3 text-xs text-amber-800">
                    Code is sent only to {booking.maskedEmail} (ECD portal OTP — no captcha).
                    Staff (manager+) can edit without OTP when signed in.
                  </p>
                  {otpStep === 'idle' && (
                    <Button type="button" size="sm" disabled={otpBusy} onClick={startOtp}>
                      {otpBusy ? 'Sending…' : 'Send OTP'}
                    </Button>
                  )}
                  {otpStep === 'sent' && (
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="ecd-portal-otp">6-digit code</Label>
                        <Input
                          id="ecd-portal-otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          className="w-36"
                        />
                      </div>
                      <Button type="button" size="sm" disabled={otpBusy} onClick={confirmOtp}>
                        {otpBusy ? '…' : 'Verify'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!editMode && (booking.workshops || []).length === 0 && (
                <p className="text-sm text-neutral-500">No workshops reserved yet.</p>
              )}

              {!editMode && (booking.workshops || []).length > 0 && (
                <ul className="space-y-2">
                  {booking.workshops.map((w) => (
                    <li key={w.id} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                      <div className="font-mono text-[10px] uppercase text-neutral-500">
                        {TRACK_META[w.trackIndex]?.label || `Track ${w.trackIndex}`} · {w.timeLabel}
                      </div>
                      <div className="font-medium">{w.title}</div>
                    </li>
                  ))}
                </ul>
              )}

              {editMode && booking.canEdit && (
                <div className="space-y-5">
                  {slots.map((slot) => (
                    <div key={slot.timeLabel}>
                      <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-600">
                        {slot.timeLabel} — pick one
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {slot.options.map((opt) => {
                          const selected = selection[slot.timeLabel] === opt.slug;
                          const disabled = !opt.available && !selected;
                          const track = TRACK_META[opt.trackIndex];
                          return (
                            <button
                              key={opt.slug}
                              type="button"
                              disabled={disabled}
                              aria-pressed={selected}
                              onClick={() => pickWorkshop(slot.timeLabel, opt)}
                              className={cn(
                                'group relative flex min-h-[108px] flex-col rounded-xl border bg-white p-3.5 text-left transition duration-200',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
                                selected
                                  ? 'border-emerald-500 shadow-md ring-2 ring-emerald-400 ring-offset-1'
                                  : 'border-neutral-200 shadow-none',
                                disabled
                                  ? 'cursor-not-allowed opacity-45'
                                  : 'hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md active:translate-y-0 active:scale-[0.99]',
                              )}
                            >
                              <div className="mb-2.5 flex items-start justify-between gap-2">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em]',
                                    track?.text || 'text-neutral-500',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 shrink-0 rounded-full',
                                      track?.dot || 'bg-neutral-400',
                                    )}
                                  />
                                  {track?.label || 'TRACK'}
                                </span>
                                <span
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none',
                                    seatBadgeClass(opt.seatStatus),
                                  )}
                                >
                                  {opt.seatStatus}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  'flex-1 text-[13px] font-semibold leading-snug text-neutral-900',
                                  selected && 'pr-6',
                                )}
                              >
                                {opt.title}
                              </div>
                              {selected ? (
                                <span className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-neutral-900 shadow-sm">
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {slots.length === 0 && (
                    <p className="text-sm text-neutral-500">Workshop schedule loading…</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {booking.ticketType === 'ct' && (
          <p className="text-sm text-neutral-600">
            Control Tower Pass includes the main stage. Workshop room seats are Full Journey only.
          </p>
        )}
      </div>
    </Layout>
  );
};

export default EcdBookingPortalPage;
