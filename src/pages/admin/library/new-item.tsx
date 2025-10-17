import { BookOpen, Lock } from 'lucide-react';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const NewLibraryItemPage = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <BookOpen className="h-5 w-5" />
              Add Library Asset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The admin upload workflow is being migrated to the new Hono API. Until that lands,
              please upload assets via the backend CLI script or contact the engineering team for
              assistance. This keeps our MVP simple while we validate the member experience.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <Lock className="h-5 w-5" />
              <span>
                Direct storage access has been disabled in the SPA to avoid exposing secrets.
              </span>
            </div>
            <Button variant="outline" onClick={() => history.back()}>
              Return to Library Admin
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default NewLibraryItemPage;
