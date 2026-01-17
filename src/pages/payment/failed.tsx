import { XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('error');

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700">Payment Failed</CardTitle>
            <CardDescription>
              {errorMessage ||
                "We couldn't process your payment. No charges were made to your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              Common reasons for payment failure:
              <ul className="mt-2 list-inside list-disc text-left">
                <li>Insufficient funds</li>
                <li>Card declined by issuing bank</li>
                <li>Incorrect card details</li>
                <li>Transaction limit exceeded</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/meetups">Browse Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
