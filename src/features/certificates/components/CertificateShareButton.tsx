import { Check, Copy, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { certificatePublicShareUrl } from '@/app/api/certificates';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/custom/use-toast';

type CertificateShareButtonProps = {
  certificateCode: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'secondary' | 'ghost' | 'default';
};

export function CertificateShareButton({
  certificateCode,
  size = 'sm',
  variant = 'outline',
}: CertificateShareButtonProps) {
  const { t } = useTranslation('dashboard');
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = certificatePublicShareUrl(certificateCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: t('certificates.shareCopiedTitle'),
        description: t('certificates.shareCopiedDesc'),
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('certificates.copyFailedTitle'),
        description: t('certificates.copyFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Button type="button" size={size} variant={variant} onClick={handleCopy}>
      {copied ? <Check className="me-2 h-4 w-4" /> : <Copy className="me-2 h-4 w-4" />}
      {copied ? t('certificates.copied') : t('certificates.copyShareLink')}
      <Link2 className="ms-2 h-3.5 w-3.5 opacity-60" />
    </Button>
  );
}
