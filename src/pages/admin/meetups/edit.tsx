import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DataLoader from '@/components/DataLoader';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useSecureQuery } from '@/hooks/useSecureQuery';
import { secureAdminOperation, initializeAdminSecurity, getStoredCSRFToken } from '@/utils/csrfProtection';

interface FormValues {
  title: string;
  date: string; // datetime-local
  location?: string;
  max_attendees?: number | '';
  description?: string;
}

const EditMeetup: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const { safeInvalidateQueries, safeAsyncOperation, isMounted } = useSecureQuery();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Initialize CSRF protection
  useEffect(() => {
    const initSecurity = async () => {
      const security = await initializeAdminSecurity();
      setCsrfToken(getStoredCSRFToken() || '');
      
      if (security.warnings.length > 0) {
        console.warn('Security warnings detected:', security.warnings);
      }
    };
    initSecurity();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id) { setError('Missing meetup id'); setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('events')
          .select('title, date, location, max_attendees, description')
          .eq('id', id)
          .maybeSingle();
        if (error) { setError(error.message); return; }
        if (data) {
          // Format date for datetime-local (YYYY-MM-DDTHH:MM)
          const dt = data.date ? new Date(data.date) : null;
          const formatted = dt ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
          setValue('title', data.title ?? '');
          setValue('date', formatted);
          setValue('location', data.location ?? '');
          setValue('max_attendees', (data.max_attendees ?? '') as any);
          setValue('description', data.description ?? '');
        }
      } catch (e) {
        setError('Failed to load meetup');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, setValue]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    
    // Use safe async operation to prevent memory leaks
    await safeAsyncOperation(
      async () => {
        // Execute update with CSRF protection
        const result = await secureAdminOperation(async () => {
          const iso = values.date ? new Date(values.date).toISOString() : null;
          const { error } = await supabase
            .from('events')
            .update({
              title: values.title,
              date: iso,
              location: values.location || null,
              max_attendees: values.max_attendees === '' ? null : Number(values.max_attendees),
              description: values.description || null,
            })
            .eq('id', id);
          
          if (error) throw error;
          return true;
        }, csrfToken);

        if (!result.success) {
          throw new Error(result.error || 'Update failed');
        }

        return result.data;
      },
      // Success callback - only runs if component is still mounted
      () => {
        if (isMounted()) {
          toast({ title: 'Meetup updated' });
          // Safe invalidation with mount check
          safeInvalidateQueries(['meetups']);
          navigate('/admin/meetups');
        }
      },
      // Error callback - only runs if component is still mounted
      (error: any) => {
        if (isMounted()) {
          toast({ 
            title: 'Update failed', 
            description: error?.message || 'Please try again', 
            variant: 'destructive' 
          });
        }
      }
    );
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <DataLoader loading={loading} error={error} loadingText="Loading meetup...">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Edit Meetup</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                  <Input {...register('title', { required: true })} placeholder="Meetup title" />
                  {errors.title && <p className="text-sm text-destructive mt-1">Title is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date & Time *</label>
                  <Input type="datetime-local" {...register('date', { required: true })} />
                  {errors.date && <p className="text-sm text-destructive mt-1">Date is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <Input {...register('location')} placeholder="Online / City, Venue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Max Attendees</label>
                  <Input type="number" min={1} {...register('max_attendees')} placeholder="e.g. 100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <Textarea rows={6} {...register('description')} placeholder="Describe the meetup" />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/admin/meetups')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </DataLoader>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default EditMeetup;
