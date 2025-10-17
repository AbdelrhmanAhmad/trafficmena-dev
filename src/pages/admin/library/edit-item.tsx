import { Pencil, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const EditLibraryItemPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <Pencil className="h-5 w-5" />
              Edit Library Asset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Library editing from the dashboard is paused while we switch to the unified API.
              Please update asset <span className="font-semibold">{id}</span> via the CLI tooling or
              the Hono admin endpoint once it ships. This ensures uploads stay secure during the
              migration away from Supabase storage.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <ShieldAlert className="h-5 w-5" />
              <span>
                Direct bucket access was removed from the SPA to prevent leaking storage keys.
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin/library')}>
                Back to Library Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default EditLibraryItemPage;
