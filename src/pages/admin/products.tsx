
import React, { useState } from 'react';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package } from 'lucide-react';
import { useErrorHandler } from '@/utils/errorHandling';
import { validateProductData, sanitizeText } from '@/utils/validation';

/**
 * Bug #15 Fix: Standardized component using function declaration
 * Bug #16 Fix: Admin component for managing product creation with comprehensive validation
 */
function AdminProducts() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };


  const clearForm = () => {
    setFormData({
      name: '',
      description: '',
      price: ''
    });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Bug #11 Fix: Use comprehensive server-side validation
    const validation = validateProductData(formData);
    if (!validation.isValid) {
      const errors: {[key: string]: string} = {};
      validation.errors.forEach(error => {
        errors[error.field] = error.message;
      });
      setFormErrors(errors);
      
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for insertion with sanitization
      const productData = {
        name: sanitizeText(formData.name),
        description: formData.description ? sanitizeText(formData.description) : null,
        price: formData.price ? parseFloat(formData.price) : null
      };

      // Insert product into database
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select();

      if (error) {
        const appError = handleError(error);
        toast({
          title: "Error",
          description: appError.message,
          variant: "destructive",
        });
        return;
      }

      // Success - clear form and show success message
      clearForm();
      toast({
        title: "Success",
        description: "Product created successfully!",
      });

    } catch (error) {
      const appError = handleError(error);
      toast({
        title: "Error",
        description: appError.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bug #12 Fix: Wrap with AdminProtectedRoute
  return (
    <AdminProtectedRoute>
      <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Digital Products</h1>
            <p className="text-gray-600">Manage your digital products and course offerings</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Create New Digital Product</CardTitle>
            <CardDescription>
              Add a new digital product to your catalog. File uploads will be added later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className={formErrors.name ? 'border-red-500' : ''}
                  required
                  disabled={isSubmitting}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  className={formErrors.description ? 'border-red-500' : ''}
                  rows={4}
                  disabled={isSubmitting}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className={formErrors.price ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {formErrors.price && (
                  <p className="text-sm text-red-600">{formErrors.price}</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Product...
                    </>
                  ) : (
                    'Create Product'
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={clearForm}
                  disabled={isSubmitting}
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>
              Product management features will be added in future updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section will display existing products and management options in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
}

export default AdminProducts;
