import { Check, Copy, Link2 } from 'lucide-react';
import { useState } from 'react';
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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = certificatePublicShareUrl(certificateCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Share link copied',
        description: 'Anyone with this link can verify and download the certificate.',
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the link to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button type="button" size={size} variant={variant} onClick={handleCopy}>
      {copied ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Copy className="mr-2 h-4 w-4" />
      )}
      {copied ? 'Copied' : 'Copy share link'}
      <Link2 className="ml-2 h-3.5 w-3.5 opacity-60" />
    </Button>
  );
}
