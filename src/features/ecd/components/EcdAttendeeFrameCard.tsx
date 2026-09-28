import { Download, ImagePlus, Loader2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { uploadEcdAttendeeFrame } from '@/app/api/ecd';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { cn } from '@/shared/lib/utils';

const FRAME_W = 1080;
const FRAME_H = 1350;
const HOLE = { x: 218, y: 450, w: 640, h: 554, r: 48 };
const FRAME_SRC = '/ecd/attendee-frame.png';

function coverScale(imgW: number, imgH: number, holeW: number, holeH: number) {
  return Math.max(holeW / imgW, holeH / imgH);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

type Props = {
  orderCode: string;
  existingUrl?: string | null;
  canEdit?: boolean;
  access?: string | null;
  editToken?: string | null;
  onSaved?: (url: string) => void;
  className?: string;
};

export function EcdAttendeeFrameCard({
  orderCode,
  existingUrl,
  canEdit = true,
  access,
  editToken,
  onSaved,
  className,
}: Props) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameImg, setFrameImg] = useState<HTMLImageElement | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(existingUrl || '');
  const drag = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    setSavedUrl(existingUrl || '');
  }, [existingUrl]);

  useEffect(() => {
    let cancelled = false;
    loadImage(FRAME_SRC)
      .then((img) => {
        if (!cancelled) setFrameImg(img);
      })
      .catch(() => {
        toast({
          title: 'Frame unavailable',
          description: 'Could not load attending frame template.',
          variant: 'destructive',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);

    if (photo) {
      const base = coverScale(photo.width, photo.height, HOLE.w, HOLE.h) * scale;
      const drawW = photo.width * base;
      const drawH = photo.height * base;
      const cx = HOLE.x + HOLE.w / 2 + ox;
      const cy = HOLE.y + HOLE.h / 2 + oy;
      ctx.save();
      roundRect(ctx, HOLE.x, HOLE.y, HOLE.w, HOLE.h, HOLE.r);
      ctx.clip();
      ctx.drawImage(photo, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      ctx.restore();
    }

    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H);
    }
  }, [frameImg, photo, scale, ox, oy]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      setPhoto(img);
      setScale(1);
      setOx(0);
      setOy(0);
    } catch {
      toast({ title: 'Invalid photo', variant: 'destructive' });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!photo || !canEdit) return;
    drag.current = { active: true, x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active || !photo || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = FRAME_W / rect.width;
    const scaleY = FRAME_H / rect.height;
    const dx = (e.clientX - drag.current.x) * scaleX;
    const dy = (e.clientY - drag.current.y) * scaleY;
    drag.current = { active: true, x: e.clientX, y: e.clientY };
    const base = coverScale(photo.width, photo.height, HOLE.w, HOLE.h) * scale;
    const drawW = photo.width * base;
    const drawH = photo.height * base;
    const maxOx = Math.max(0, (drawW - HOLE.w) / 2);
    const maxOy = Math.max(0, (drawH - HOLE.h) / 2);
    setOx((v) => Math.max(-maxOx, Math.min(maxOx, v + dx)));
    setOy((v) => Math.max(-maxOy, Math.min(maxOy, v + dy)));
  };

  const onPointerUp = () => {
    drag.current.active = false;
  };

  const save = async () => {
    if (!photo || !canvasRef.current) return;
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const result = await uploadEcdAttendeeFrame(orderCode, dataUrl, {
        access,
        editToken,
      });
      setSavedUrl(result.attendeeFrameUrl);
      onSaved?.(result.attendeeFrameUrl);
      toast({ title: 'Attending photo saved' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('rounded-2xl border border-neutral-200 bg-white p-5', className)}>
      <div className="mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-600">
          Share that you are attending
        </div>
        <h3 className="mt-1 text-lg font-bold text-neutral-900">Attending photo</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Place your photo in the official ECommerce Day frame, then confirm to save.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="rounded-xl bg-neutral-950 p-3">
          <canvas
            ref={canvasRef}
            className={cn(
              'mx-auto block w-full max-w-[280px] rounded-lg',
              photo && canEdit ? 'cursor-grab active:cursor-grabbing' : '',
            )}
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        <div className="flex flex-col gap-3">
          {canEdit ? (
            <>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-900 px-4 py-2.5 text-sm font-semibold text-neutral-900">
                <ImagePlus className="h-4 w-4" />
                Choose photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                />
              </label>
              <label className="text-sm text-neutral-600">
                Zoom
                <input
                  type="range"
                  min={100}
                  max={250}
                  value={Math.round(scale * 100)}
                  disabled={!photo}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="mt-1 w-full"
                />
              </label>
              <Button
                type="button"
                disabled={!photo || saving}
                onClick={() => void save()}
                className="bg-[#05EF62] font-semibold text-neutral-950 hover:bg-[#04c44e]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : savedUrl ? (
                  'Update photo'
                ) : (
                  'Confirm & save'
                )}
              </Button>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              Verify your email to create or update your attending photo.
            </p>
          )}

          {savedUrl ? (
            <a
              href={savedUrl}
              download="ecommerce-day-2026-attending.png"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download attending photo
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default EcdAttendeeFrameCard;
