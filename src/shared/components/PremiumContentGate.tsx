import { ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

type PremiumContentGateProps = {
  contentName?: string | null;
  backTo?: string;
};

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <title>WhatsApp</title>
      <path d="M19.11 17.27c-.28-.14-1.63-.8-1.88-.89-.25-.09-.43-.14-.61.14s-.7.89-.86 1.08c-.16.19-.31.21-.58.07-.28-.14-1.16-.43-2.2-1.37-.81-.72-1.35-1.62-1.5-1.89-.16-.28-.02-.43.12-.57.12-.12.28-.31.42-.47.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.61-1.48-.84-2.03-.22-.52-.45-.45-.61-.46h-.52c-.19 0-.49.07-.75.35-.25.28-.98.96-.98 2.35s1.01 2.73 1.15 2.91c.14.19 1.98 3.02 4.79 4.24.67.29 1.2.47 1.61.6.68.22 1.29.19 1.78.12.54-.08 1.63-.67 1.86-1.31.23-.63.23-1.17.16-1.28-.07-.12-.25-.19-.53-.33Z" />
      <path d="M16 .96C7.7.96.96 7.7.96 16c0 2.64.69 5.21 1.99 7.48L.96 31.04l7.76-1.95A14.95 14.95 0 0 0 16 31.04c8.3 0 15.04-6.74 15.04-15.04S24.3.96 16 .96Zm0 27.4c-2.31 0-4.57-.62-6.55-1.8l-.47-.28-4.61 1.16 1.23-4.49-.31-.46a12.27 12.27 0 0 1-1.88-6.5c0-6.78 5.52-12.29 12.31-12.29 3.29 0 6.37 1.28 8.7 3.61a12.2 12.2 0 0 1 3.61 8.68c0 6.79-5.52 12.31-12.29 12.31Z" />
    </svg>
  );
}

export default function PremiumContentGate({
  contentName,
  backTo = '/dashboard/library',
}: PremiumContentGateProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Premium Content</h1>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 text-center">
          {contentName ? (
            <p className="text-sm font-medium text-neutral-500">{contentName}</p>
          ) : null}
          <p className="text-neutral-600">
            This content is premium and isn&apos;t currently available with your account. If you
            need access, contact us and we&apos;ll help you.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link to={backTo}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Library
              </Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:shadow-xl"
            >
              <a href="https://wa.me/201505437979" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                Contact Us
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
