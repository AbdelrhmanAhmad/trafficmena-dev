import { useMutation, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { useCallback, useState } from 'react';
import { useToast } from '@/shared/components/ui/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { CSVService } from '../services/CSVService';
import { InvitationService } from '../services/InvitationService';
import type {
  CreateBulkInvitationsFormData,
  CreateInvitationFormData,
  CSVProcessingSummary,
  CSVRowData,
} from '../types';

const csvService = CSVService.getInstance();
const invitationService = InvitationService.getInstance();

export interface ParsedCSVData {
  data: CreateInvitationFormData[];
  summary: CSVProcessingSummary;
  isValid: boolean;
}

/**
 * Hook for CSV batch upload functionality
 */
export function useBatchUpload(onUploadSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  // Local state for CSV processing
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<CSVRowData[]>([]);

  // Parse CSV file
  const parseCSV = useCallback(
    async (file: File): Promise<void> => {
      if (!file) return;

      setIsProcessing(true);

      try {
        // Validate file
        const fileValidation = csvService.validateFile(file);
        if (!fileValidation.isValid) {
          toast({
            title: 'Invalid File',
            description: fileValidation.errors.join(', '),
            variant: 'destructive',
          });
          return;
        }

        // Parse with Papa Parse
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim().toLowerCase(),
          complete: async (results) => {
            try {
              // Process the CSV data
              const processResult = await csvService.processCSVData(results.data as CSVRowData[]);

              if (processResult.success && processResult.data) {
                const { validInvitations, summary } = processResult.data;

                const parsedResult: ParsedCSVData = {
                  data: validInvitations,
                  summary,
                  isValid: summary.validRows > 0,
                };

                setParsedData(parsedResult);
                setPreviewData(results.data.slice(0, 10) as CSVRowData[]); // Show first 10 rows

                // Show summary toast
                toast({
                  title: 'CSV Processed',
                  description: `${summary.validRows} valid rows, ${summary.invalidRows} invalid rows`,
                  variant: summary.invalidRows > 0 ? 'default' : 'default',
                });
              } else {
                throw new Error(processResult.error || 'Failed to process CSV');
              }
            } catch (error) {
              handleError(error);
              toast({
                title: 'Processing Error',
                description: 'Failed to process CSV file',
                variant: 'destructive',
              });
            } finally {
              setIsProcessing(false);
            }
          },
          error: (error) => {
            handleError(error);
            toast({
              title: 'Parse Error',
              description: 'Failed to parse CSV file',
              variant: 'destructive',
            });
            setIsProcessing(false);
          },
        });
      } catch (error) {
        handleError(error);
        toast({
          title: 'File Error',
          description: 'Failed to read CSV file',
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    },
    [toast, handleError],
  );

  // Upload parsed data
  const uploadMutation = useMutation({
    mutationFn: async ({ batchName, createdBy }: { batchName?: string; createdBy: string }) => {
      if (!parsedData || !parsedData.isValid) {
        throw new Error('No valid data to upload');
      }

      const bulkData: CreateBulkInvitationsFormData = {
        invitations: parsedData.data,
        batch_name: batchName,
        source: 'csv',
      };

      return invitationService.createBulkInvitations(bulkData, createdBy);
    },
    onSuccess: (result) => {
      if (result.success) {
        const { data } = result;
        if (data) {
          toast({
            title: 'Upload Successful',
            description: `${data.invitations.length} invitations created${
              data.failed.length > 0 ? `, ${data.failed.length} failed` : ''
            }`,
          });

          // Clear processed data
          clearData();

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['invitations'] });
          queryClient.invalidateQueries({ queryKey: ['invitation-stats'] });

          // Call success callback if provided
          onUploadSuccess?.();
        }
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Failed to create invitations',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload invitations',
        variant: 'destructive',
      });
    },
  });

  // Generate CSV template
  const generateTemplate = useCallback((): string => {
    return csvService.generateTemplate();
  }, []);

  // Download CSV template
  const downloadTemplate = useCallback((): void => {
    const template = generateTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'invitation_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [generateTemplate]);

  // Clear processed data
  const clearData = useCallback((): void => {
    setParsedData(null);
    setPreviewData([]);
  }, []);

  // Validate individual row
  const validateRow = useCallback((row: CSVRowData, index: number) => {
    return csvService.validateCSVRow(row, index);
  }, []);

  return {
    // Data
    parsedData,
    previewData,
    hasValidData: parsedData?.isValid || false,
    validRowCount: parsedData?.summary.validRows || 0,
    invalidRowCount: parsedData?.summary.invalidRows || 0,
    duplicateRowCount: parsedData?.summary.duplicateRows || 0,
    errors: parsedData?.summary.errors || [],
    warnings: parsedData?.summary.warnings || [],

    // Loading states
    isProcessing,
    isUploading: uploadMutation.isPending,

    // Actions
    parseCSV,
    upload: uploadMutation.mutate,
    generateTemplate,
    downloadTemplate,
    clearData,
    validateRow,

    // Upload result
    uploadResult: uploadMutation.data,
    uploadError: uploadMutation.error,
  };
}

/**
 * Hook for drag and drop file handling
 */
export function useFileDropzone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev - 1);
      if (dragCounter <= 1) {
        setIsDragActive(false);
      }
    },
    [dragCounter],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent, onFileSelect: (file: File) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDragCounter(0);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'text/csv') {
        onFileSelect(file);
      }
    }
  }, []);

  return {
    isDragActive,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
  };
}
