
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import LibraryGrid from '@/components/LibraryGrid';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useLibraryAssetsQuery } from '@/hooks/queries/useLibraryAssetsQuery';

// Bug #14 Fix: Replace mock data with actual database queries
interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_url: string | null;
  created_at: string;
}

/**
 * Bug #15 Fix: Standardized component using function declaration  
 * Bug #16 Fix: Library management component with comprehensive interface documentation
 */
function LibraryManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Query library assets (first 100 items)
  const { data: assetsData, isLoading, isError, error, refetch } = useLibraryAssetsQuery(1, 100);


  // Show error toast if needed
  React.useEffect(() => {
    if (isError) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load library items. Please try again.',
        variant: 'destructive',
      });
    }
  }, [isError, error]);

  // Transform library items to match LibraryGrid expected format
  const transformedItems = (assetsData?.items ?? []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    type: item.file_type,
    videoUrl: item.file_url,
    createdAt: item.created_at
  }));

  const handleEdit = (itemId: string | number) => {
    navigate(`/admin/library/edit/${itemId}`);
  };

  const handleDelete = async (itemId: string | number) => {
    try {
      const { error } = await supabase
        .from('library_assets')
        .delete()
        .eq('id', String(itemId)); // Convert to string for database query

      if (error) {
        console.error('Error deleting library item:', error);
        toast({
          title: "Error",
          description: "Failed to delete library item.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Library item deleted successfully.",
      });
      
      // Refresh the items
      refetch();
    } catch (error) {
      console.error('Unexpected error deleting library item:', error);
      toast({
        title: "Error", 
        description: "An unexpected error occurred while deleting the item.",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = () => {
    navigate('/admin/library/new-item');
  };

  if (isLoading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <LoadingSpinner size="lg" text="Loading library items..." />
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary">Library Management</h1>
              <p className="text-gray-600 mt-2">
                Organize and manage assets from past meetups and training sessions.
              </p>
            </div>
            
            <Button 
              onClick={handleAddNew}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </div>

          {/* Library Items Grid */}
          <LibraryGrid
            items={transformedItems}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddNew={handleAddNew}
          />
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

export default LibraryManagement;
