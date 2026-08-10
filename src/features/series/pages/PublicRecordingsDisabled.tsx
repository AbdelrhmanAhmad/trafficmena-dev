import { Ban } from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';

/** Temporary public disable for Series Recordings storefront. */
const PublicRecordingsDisabledPage: React.FC = () => {
  return (
    <Layout>
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
          <Ban className="h-7 w-7 text-neutral-500" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Recordings unavailable</h1>
        <p className="text-neutral-600">
          This page is temporarily disabled. Browse learning tracks or return to the homepage.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/tracks">View Tracks</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default PublicRecordingsDisabledPage;
