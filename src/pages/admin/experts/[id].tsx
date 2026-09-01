import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteExpertPermanent, fetchExpertAdmin, type ExpertAdminRecord } from '@/app/api/experts';
import { ExpertForm, ExpertLifecycleActions } from '@/features/experts/components/ExpertForm';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

function EditExpertPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useRolePermissions();
  const [expert, setExpert] = useState<ExpertAdminRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchExpertAdmin(id);
        if (!cancelled) setExpert(data.expert);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Failed to load expert',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this expert profile? This cannot be undone.')) return;
    try {
      await deleteExpertPermanent(id);
      toast({ title: 'Expert deleted' });
      navigate('/admin/experts');
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!expert) return <p className="text-red-600">Expert not found.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit expert profile</h1>
          <p className="text-neutral-600">{expert.displayNameEn}</p>
        </div>
        <ExpertLifecycleActions expert={expert} onChanged={setExpert} />
      </div>

      <ExpertForm
        mode="edit"
        expertId={id}
        onSaved={setExpert}
        onCancel={() => navigate('/admin/experts')}
      />

      {isAdmin ? (
        <div className="border-t pt-6">
          <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
            Permanently delete expert
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminEditExpertPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <EditExpertPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
