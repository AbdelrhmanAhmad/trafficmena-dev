
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateLibraryAssetData } from '@/utils/validation';
import { validateFile, sanitizeFilename, FILE_VALIDATION_PRESETS, scanFileContent } from '@/utils/fileValidation';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import VideoEmbed from '@/components/VideoEmbed';
import RichTextEditor from '@/components/RichTextEditor';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LibraryFormData {
  title: string;
  description: string;
  videoUrl?: string;
  pdfFile?: File;
}

/**
 * Bug #15 Fix: Standardized component using function declaration
 * Bug #16 Fix: Component for creating new library items with form validation
 */
function NewLibraryItem() {
  const navigate = useNavigate();
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileValidationResult, setFileValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const { toast } = useToast();
  const form = useForm<LibraryFormData>();

  const onSubmit = async (data: LibraryFormData) => {
    try {
      setIsSubmitting(true);

      // Validate form data
      const validation = validateLibraryAssetData({
        title: data.title,
        description: data.description,
        file_type: data.videoUrl ? 'Video' : 'Document',
        file_url: data.videoUrl
      });

      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors[0]?.message || "Please check your input",
          variant: "destructive",
        });
        return;
      }

      // Insert into database
      const { error } = await supabase
        .from('library_assets')
        .insert({
          title: data.title.trim(),
          description: data.description.trim() || null,
          file_type: data.videoUrl ? 'Video' : 'Document',
          file_url: data.videoUrl?.trim() || null,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create library item. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Library item created successfully!",
      });

      navigate('/admin/library');
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoUrlChange = (url: string) => {
    setPreviewVideoUrl(url);
  };

  const handleDescriptionChange = (value: string) => {
    form.setValue('description', value);
  };

  const handleFileChange = async (file: File | undefined) => {
    setFileValidationResult(null);
    
    if (!file) {
      return;
    }

    setIsValidatingFile(true);
    
    try {
      // Validate file with document-specific settings
      const validation = validateFile(file, FILE_VALIDATION_PRESETS.DOCUMENTS_ONLY);
      
      // Perform additional content scanning
      const contentScan = await scanFileContent(file);
      
      // Combine results
      const combinedResult = {
        isValid: validation.isValid && contentScan.isValid,
        errors: [...validation.errors, ...contentScan.errors],
        warnings: [...validation.warnings, ...contentScan.warnings],
      };
      
      setFileValidationResult(combinedResult);
      
      if (!combinedResult.isValid) {
        // Clear the file input if validation fails
        form.setValue('pdfFile', undefined);
        toast({
          title: "File Validation Failed",
          description: combinedResult.errors[0] || "The selected file is not valid",
          variant: "destructive",
        });
      } else if (combinedResult.warnings.length > 0) {
        toast({
          title: "File Upload Warning",
          description: combinedResult.warnings[0],
          variant: "default",
        });
      } else {
        toast({
          title: "File Validated",
          description: "File passed security checks and is ready for upload",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('File validation error:', error);
      setFileValidationResult({
        isValid: false,
        errors: ['Failed to validate file. Please try again.'],
        warnings: [],
      });
      toast({
        title: "Validation Error",
        description: "Could not validate the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingFile(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/library')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Add New Library Item</h1>
              <p className="text-gray-600 mt-2">
                Upload a new document or embed a video from YouTube or Bunny CDN to the library.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <Card className="max-w-4xl">
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: "Title is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter item title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    rules={{ required: "Description is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={handleDescriptionChange}
                            placeholder="Enter item description with formatting..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video URL (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="Enter YouTube URL, Bunny CDN URL, or embed code"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handleVideoUrlChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500 mt-1">
                            Supports YouTube URLs (youtube.com, youtu.be) and Bunny CDN URLs
                          </p>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pdfFile"
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem>
                          <FormLabel>PDF/Document Upload (Optional)</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Input
                                type="file"
                                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
                                disabled={isValidatingFile}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  onChange(file);
                                  handleFileChange(file);
                                }}
                                {...field}
                                value=""
                              />
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>• Maximum file size: 25MB</p>
                                <p>• Allowed formats: PDF, PowerPoint, Word, Text files</p>
                                <p>• Files are automatically scanned for security threats</p>
                                <p>• Only administrators can upload files to the library</p>
                              </div>
                              
                              {isValidatingFile && (
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Validating file security and format...
                                  </AlertDescription>
                                </Alert>
                              )}
                              
                              {fileValidationResult && (
                                <Alert variant={fileValidationResult.isValid ? "default" : "destructive"}>
                                  {fileValidationResult.isValid ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4" />
                                  )}
                                  <AlertDescription>
                                    {fileValidationResult.isValid ? (
                                      <div>
                                        <p className="font-medium text-green-700">File validation passed</p>
                                        {fileValidationResult.warnings.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-sm text-yellow-600">Warnings:</p>
                                            <ul className="text-sm text-yellow-600 list-disc list-inside">
                                              {fileValidationResult.warnings.map((warning, index) => (
                                                <li key={index}>{warning}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="font-medium text-red-700">File validation failed</p>
                                        <ul className="text-sm text-red-600 list-disc list-inside mt-1">
                                          {fileValidationResult.errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Video Preview */}
                  {previewVideoUrl && (
                    <div className="space-y-2">
                      <FormLabel>Video Preview</FormLabel>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <VideoEmbed url={previewVideoUrl} />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/admin/library')}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || (fileValidationResult && !fileValidationResult.isValid)}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Item'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

export default NewLibraryItem;
