import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_CERTIFICATE_DESIGN,
  type CertificateDesignSettings,
  type CertificateFieldSettings,
} from '@/app/api/certificates';
import { uploadFile } from '@/app/api/uploads';
import { CertificateDesignPreview } from '@/features/certificates/components/CertificateDesignPreview';
import {
  useGlobalCertificateSettings,
  useUpdateGlobalCertificateSettings,
} from '@/features/certificates/hooks/useCertificates';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const FIELD_KEYS = [
  { key: 'studentName' as const, label: 'Student name' },
  { key: 'courseTitle' as const, label: 'Course title' },
  { key: 'issueDate' as const, label: 'Issue date' },
  { key: 'certificateCode' as const, label: 'Certificate code' },
];

function FieldEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CertificateFieldSettings;
  onChange: (next: CertificateFieldSettings) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="font-medium text-sm">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label className="text-xs">X %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={value.x}
            onChange={(e) => onChange({ ...value, x: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Y %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={value.y}
            onChange={(e) => onChange({ ...value, y: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Font size</Label>
          <Input
            type="number"
            min={8}
            max={120}
            value={value.fontSize}
            onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="text"
            value={value.color}
            onChange={(e) => onChange({ ...value, color: e.target.value })}
            placeholder="#111827"
          />
        </div>
        <div>
          <Label className="text-xs">Align</Label>
          <Select
            value={value.align}
            onValueChange={(v) =>
              onChange({ ...value, align: v as CertificateFieldSettings['align'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Weight</Label>
          <Select
            value={value.fontWeight}
            onValueChange={(v) =>
              onChange({ ...value, fontWeight: v as CertificateFieldSettings['fontWeight'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function GlobalCertificateSettingsForm() {
  const { data, isLoading } = useGlobalCertificateSettings();
  const saveMutation = useUpdateGlobalCertificateSettings();
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<CertificateDesignSettings>(DEFAULT_CERTIFICATE_DESIGN);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setBackgroundUrl(data.backgroundImageUrl);
    setSettings(data.settings ?? DEFAULT_CERTIFICATE_DESIGN);
  }, [data]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadFile({ file, scope: 'certificates' });
      setBackgroundUrl(result.url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      backgroundImageUrl: backgroundUrl,
      settings,
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Certificate design</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Global template used by all masterclasses with certificates enabled. English text only.
        </p>
      </div>

      <CertificateDesignPreview backgroundImageUrl={backgroundUrl} settings={settings} />

      <div className="space-y-3">
        <Label>Background image (PNG/JPG)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => void handleImageUpload(e)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload background
        </Button>
      </div>

      <div className="space-y-4">
        {FIELD_KEYS.map(({ key, label }) => (
          <FieldEditor
            key={key}
            label={label}
            value={settings[key]}
            onChange={(next) => setSettings((prev) => ({ ...prev, [key]: next }))}
          />
        ))}
      </div>

      <Button type="button" disabled={saveMutation.isPending} onClick={() => void handleSave()}>
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save certificate design
      </Button>
    </div>
  );
}
