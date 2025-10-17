import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, Upload, User, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAuth } from '@/shared/context/AuthContext';
import { useBatchUpload } from '../hooks/useBatchUpload';
import { useInvitationMutations } from '../hooks/useInvitationMutations';
import type { CreateInvitationFormData } from '../types';
import { CSVUpload } from './CSVUpload';

// Schema for single invitation form
const singleInvitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  custom_message: z.string().optional(),
});

type SingleInvitationForm = z.infer<typeof singleInvitationSchema>;

// Schema for bulk invitation form
const bulkInvitationSchema = z.object({
  batch_name: z.string().min(1, 'Batch name is required'),
});

type BulkInvitationForm = z.infer<typeof bulkInvitationSchema>;

interface SendInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvitationModal({ open, onOpenChange }: SendInvitationModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('single');

  // Success handlers for closing modal and resetting forms
  const handleSingleSuccess = () => {
    singleForm.reset();
    onOpenChange(false);
  };

  const handleBulkSuccess = () => {
    bulkForm.reset();
    clearData();
    onOpenChange(false);
  };

  // Use mutations-only hook (no data fetching)
  const { createSingleInvitation, isCreatingSingle } = useInvitationMutations({
    onSingleSuccess: handleSingleSuccess,
    onBulkSuccess: handleBulkSuccess,
  });

  // Hooks for bulk upload
  const {
    parsedData,
    hasValidData,
    validRowCount,
    invalidRowCount,
    errors,
    warnings,
    isProcessing,
    isUploading,
    parseCSV,
    upload,
    clearData,
    downloadTemplate,
  } = useBatchUpload(handleBulkSuccess);

  // Forms
  const singleForm = useForm<SingleInvitationForm>({
    resolver: zodResolver(singleInvitationSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      custom_message: '',
    },
  });

  const bulkForm = useForm<BulkInvitationForm>({
    resolver: zodResolver(bulkInvitationSchema),
    defaultValues: {
      batch_name: '',
    },
  });

  // Handle single invitation submission
  const onSubmitSingle = async (data: SingleInvitationForm) => {
    if (!user?.id) {
      return;
    }

    const invitationData: CreateInvitationFormData = {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      custom_message: data.custom_message,
    };

    // Call mutation and let it handle success/error via its callbacks
    createSingleInvitation({
      data: invitationData,
      createdBy: user.id,
      customMessage: data.custom_message,
    });
  };

  // Handle bulk invitation submission
  const onSubmitBulk = async (data: BulkInvitationForm) => {
    if (!user?.id || !hasValidData) return;

    // Call mutation and let it handle success/error via its callbacks
    upload({
      batchName: data.batch_name,
      createdBy: user.id,
    });
  };

  // Handle modal close
  const handleClose = () => {
    singleForm.reset();
    bulkForm.reset();
    clearData();
    setActiveTab('single');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send User Invitations
          </DialogTitle>
          <DialogDescription>
            Send individual invitations or upload a CSV file for bulk invitations
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Single Invitation
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          {/* Single Invitation Tab */}
          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Single Invitation</CardTitle>
                <CardDescription>Send an invitation to one person</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        {...singleForm.register('email')}
                        className={singleForm.formState.errors.email ? 'border-red-500' : ''}
                      />
                      {singleForm.formState.errors.email && (
                        <p className="text-sm text-red-600">
                          {singleForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="John"
                        {...singleForm.register('first_name')}
                        className={singleForm.formState.errors.first_name ? 'border-red-500' : ''}
                      />
                      {singleForm.formState.errors.first_name && (
                        <p className="text-sm text-red-600">
                          {singleForm.formState.errors.first_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Doe"
                        {...singleForm.register('last_name')}
                        className={singleForm.formState.errors.last_name ? 'border-red-500' : ''}
                      />
                      {singleForm.formState.errors.last_name && (
                        <p className="text-sm text-red-600">
                          {singleForm.formState.errors.last_name.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom_message">Custom Message (Optional)</Label>
                    <Textarea
                      id="custom_message"
                      placeholder="Add a personal message to the invitation..."
                      rows={3}
                      {...singleForm.register('custom_message')}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreatingSingle}>
                      {isCreatingSingle ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk Upload</CardTitle>
                <CardDescription>Upload a CSV file with multiple invitations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">CSV File Upload</h3>
                  <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                    <Upload className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                <CSVUpload
                  onFileSelect={parseCSV}
                  isProcessing={isProcessing}
                  disabled={isUploading}
                />

                {/* Processing Results */}
                {parsedData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{validRowCount} Valid</Badge>
                      {invalidRowCount > 0 && (
                        <Badge variant="destructive">{invalidRowCount} Invalid</Badge>
                      )}
                      {parsedData.summary.duplicateRows > 0 && (
                        <Badge variant="secondary">
                          {parsedData.summary.duplicateRows} Duplicates
                        </Badge>
                      )}
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          <div className="font-medium mb-2">Errors found in CSV:</div>
                          <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                            {errors.slice(0, 10).map((error, index) => (
                              <li key={index}>
                                Row {error.row}: {error.message}
                              </li>
                            ))}
                            {errors.length > 10 && (
                              <li className="text-gray-500">
                                ... and {errors.length - 10} more errors
                              </li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          <div className="font-medium mb-2">Warnings:</div>
                          <ul className="list-disc list-inside text-sm">
                            {warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Batch Form */}
                    {hasValidData && (
                      <form onSubmit={bulkForm.handleSubmit(onSubmitBulk)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="batch_name">Batch Name *</Label>
                          <Input
                            id="batch_name"
                            type="text"
                            placeholder="Enter a name for this batch"
                            {...bulkForm.register('batch_name')}
                            className={bulkForm.formState.errors.batch_name ? 'border-red-500' : ''}
                          />
                          {bulkForm.formState.errors.batch_name && (
                            <p className="text-sm text-red-600">
                              {bulkForm.formState.errors.batch_name.message}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={clearData}>
                            <X className="mr-2 h-4 w-4" />
                            Clear
                          </Button>
                          <Button type="submit" disabled={isUploading}>
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Users className="mr-2 h-4 w-4" />
                                Send {validRowCount} Invitations
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
