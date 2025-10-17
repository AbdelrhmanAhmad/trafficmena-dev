import Papa from 'papaparse';
import { supabase } from '@/shared/integrations/supabase/client';
import { AppErrorHandler } from '@/shared/utils/errorHandling';
import type {
  CreateInvitationFormData,
  Invitation,
  InvitationFilters,
  ServiceResponse,
} from '../types';
import {
  type BulkValidationResult,
  type CSVRowValidationResult,
  type CSVStructureValidation,
  sanitizeCSVData,
  validateBulkEmails,
  validateCSVRow,
  validateCSVStructure,
} from '../utils/validators';
import { InvitationService } from './InvitationService';

/**
 * CSV Processing Configuration
 */
export interface CSVProcessingConfig {
  maxRows: number;
  allowedDelimiters: string[];
  encoding: string;
  skipEmptyRows: boolean;
  trimHeaders: boolean;
}

/**
 * CSV Processing Result
 */
export interface CSVProcessingResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingUsers: number;
  pendingInvitations: number;
  processedInvitations: CreateInvitationFormData[];
  validationErrors: CSVRowValidationResult[];
  bulkValidationResult?: BulkValidationResult;
  batchId?: string;
}

/**
 * CSV Export Options
 */
export interface CSVExportOptions {
  includeHeaders: boolean;
  filename?: string;
  filters?: InvitationFilters;
  includeStats: boolean;
}

/**
 * CSV Service
 * Handles CSV file parsing, validation, processing, and export functionality
 */
export class CSVService {
  private static instance: CSVService;
  private readonly invitationService: InvitationService;

  private readonly defaultConfig: CSVProcessingConfig = {
    maxRows: 1000,
    allowedDelimiters: [',', ';', '\t'],
    encoding: 'utf-8',
    skipEmptyRows: true,
    trimHeaders: true,
  };

  private constructor() {
    this.invitationService = InvitationService.getInstance();
  }

  static getInstance(): CSVService {
    if (!CSVService.instance) {
      CSVService.instance = new CSVService();
    }
    return CSVService.instance;
  }

  /**
   * Parse CSV file and return structured data
   */
  async parseCSVFile(
    file: File,
    config?: Partial<CSVProcessingConfig>,
  ): Promise<
    ServiceResponse<{
      data: Record<string, any>[];
      structureValidation: CSVStructureValidation;
      meta: Papa.ParseMeta;
    }>
  > {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };

      // Validate file
      const fileValidation = this.validateFile(file, finalConfig);
      if (!fileValidation.success) {
        return fileValidation;
      }

      // Parse CSV using Papa Parse
      const parseResult = await this.parseFile(file, finalConfig);
      if (!parseResult.success) {
        return parseResult;
      }

      const { data, meta } = parseResult.data!;

      // Validate structure
      const structureValidation = validateCSVStructure(meta.fields || []);

      // Sanitize data if structure is valid
      const sanitizedData = structureValidation.isValid ? sanitizeCSVData(data) : data;

      return {
        success: true,
        data: {
          data: sanitizedData,
          structureValidation,
          meta,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse CSV file',
      };
    }
  }

  /**
   * Validate CSV data including email formats and duplicates
   */
  async validateCSVData(data: Record<string, any>[]): Promise<
    ServiceResponse<{
      validationResults: CSVRowValidationResult[];
      bulkValidationResult: BulkValidationResult;
      summary: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
        warningRows: number;
      };
    }>
  > {
    try {
      const validationResults: CSVRowValidationResult[] = [];
      const validEmails: string[] = [];
      let validRows = 0;
      let invalidRows = 0;
      let warningRows = 0;

      // Validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowValidation = validateCSVRow(row, i + 2); // +2 for header row and 1-based indexing

        validationResults.push(rowValidation);

        if (rowValidation.isValid && rowValidation.email) {
          validEmails.push(rowValidation.email);
          validRows++;
        } else {
          invalidRows++;
        }

        if (rowValidation.warnings.length > 0) {
          warningRows++;
        }
      }

      // Perform bulk validation for duplicates and existing entries
      const bulkValidationResult = await validateBulkEmails(validEmails);
      if (!bulkValidationResult.success) {
        return {
          success: false,
          error: bulkValidationResult.error,
        };
      }

      return {
        success: true,
        data: {
          validationResults,
          bulkValidationResult: bulkValidationResult.data!,
          summary: {
            totalRows: data.length,
            validRows,
            invalidRows,
            warningRows,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate CSV data',
      };
    }
  }

  /**
   * Full CSV processing pipeline
   */
  async processCSVUpload(
    file: File,
    adminId: string,
    options: {
      batchName?: string;
      allowPartialProcessing?: boolean;
      config?: Partial<CSVProcessingConfig>;
    } = {},
  ): Promise<ServiceResponse<CSVProcessingResult>> {
    try {
      // Step 1: Parse CSV file
      const parseResult = await this.parseCSVFile(file, options.config);
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error,
        };
      }

      const { data, structureValidation } = parseResult.data!;

      if (!structureValidation.isValid) {
        return {
          success: false,
          error: `CSV structure invalid: ${structureValidation.errors.join(', ')}`,
        };
      }

      // Step 2: Validate data
      const validationResult = await this.validateCSVData(data);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      const { validationResults, bulkValidationResult, summary } = validationResult.data!;

      // Step 3: Prepare invitations from valid rows
      const processedInvitations: CreateInvitationFormData[] = [];
      const validationErrors: CSVRowValidationResult[] = [];

      for (const rowValidation of validationResults) {
        if (rowValidation.isValid && rowValidation.sanitizedData) {
          processedInvitations.push({
            email: rowValidation.sanitizedData.email,
            first_name: rowValidation.sanitizedData.first_name,
            last_name: rowValidation.sanitizedData.last_name,
          });
        } else {
          validationErrors.push(rowValidation);
        }
      }

      // Filter out emails that already exist or have pending invitations
      const finalInvitations = processedInvitations.filter((invitation) =>
        bulkValidationResult.validEmails.includes(invitation.email),
      );

      // Step 4: Create bulk invitations if we have valid data
      let batchId: string | undefined;

      if (finalInvitations.length > 0) {
        const bulkResult = await this.invitationService.createBulkInvitations(
          {
            invitations: finalInvitations,
            batch_name:
              options.batchName || `CSV Upload - ${file.name} - ${new Date().toISOString()}`,
            source: 'csv',
          },
          adminId,
        );

        if (bulkResult.success) {
          batchId = bulkResult.data!.batchId;
        } else if (!options.allowPartialProcessing) {
          return {
            success: false,
            error: `Failed to create invitations: ${bulkResult.error}`,
          };
        }
      } else if (!options.allowPartialProcessing) {
        return {
          success: false,
          error: 'No valid invitations to process after validation',
        };
      }

      const result: CSVProcessingResult = {
        success: finalInvitations.length > 0 || options.allowPartialProcessing === true,
        totalRows: summary.totalRows,
        validRows: finalInvitations.length,
        invalidRows: summary.invalidRows,
        duplicateRows: bulkValidationResult.duplicates.length,
        existingUsers: bulkValidationResult.existingUsers.length,
        pendingInvitations: bulkValidationResult.pendingInvitations.length,
        processedInvitations: finalInvitations,
        validationErrors,
        bulkValidationResult,
        batchId,
      };

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Generate CSV template for download
   */
  generateCSVTemplate(): ServiceResponse<{ content: string; filename: string }> {
    try {
      const headers = ['first_name', 'last_name', 'email'];
      const sampleData = [
        ['John', 'Doe', 'john.doe@example.com'],
        ['Jane', 'Smith', 'jane.smith@example.com'],
        ['Ahmed', 'Ali', 'ahmed.ali@example.com'],
      ];

      const csvContent = Papa.unparse({
        fields: headers,
        data: sampleData,
      });

      const filename = `trafficmena-invitations-template-${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: {
          content: csvContent,
          filename,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate CSV template',
      };
    }
  }

  /**
   * Export invitations to CSV format
   */
  async exportInvitations(options: CSVExportOptions = { includeHeaders: true }): Promise<
    ServiceResponse<{
      content: string;
      filename: string;
      totalRecords: number;
    }>
  > {
    try {
      // Get invitations based on filters
      const invitationsResult = await this.invitationService.getInvitations(
        1,
        10000, // Large limit to get all matching records
        options.filters,
      );

      if (!invitationsResult.success) {
        return {
          success: false,
          error: invitationsResult.error,
        };
      }

      const invitations = invitationsResult.data!.invitations;

      const headers = [
        'email',
        'first_name',
        'last_name',
        'status',
        'sent_at',
        'accepted_at',
        'created_at',
        'expires_at',
        'created_by',
      ];

      const data = invitations.map((invitation: Invitation) => [
        invitation.email,
        invitation.first_name || '',
        invitation.last_name || '',
        invitation.status,
        invitation.sent_at ? new Date(invitation.sent_at).toISOString() : '',
        invitation.accepted_at ? new Date(invitation.accepted_at).toISOString() : '',
        new Date(invitation.created_at).toISOString(),
        invitation.expires_at ? new Date(invitation.expires_at).toISOString() : '',
        invitation.created_by || '',
      ]);

      // Add statistics if requested
      if (options.includeStats) {
        const statsResult = await this.invitationService.getInvitationStatistics();
        if (statsResult.success) {
          const stats = statsResult.data!;
          data.unshift(
            [],
            ['STATISTICS'],
            ['Total Invitations', stats.totalInvitations.toString()],
            ['Pending', stats.pendingInvitations.toString()],
            ['Sent', stats.sentInvitations.toString()],
            ['Accepted', stats.acceptedInvitations.toString()],
            ['Failed', stats.failedInvitations.toString()],
            ['Acceptance Rate', `${stats.acceptanceRate}%`],
            ['Delivery Rate', `${stats.deliveryRate}%`],
            [],
            ['INVITATIONS'],
          );
        }
      }

      const csvContent = Papa.unparse({
        fields: options.includeHeaders ? headers : undefined,
        data,
      });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options.filename || `trafficmena-invitations-export-${timestamp}.csv`;

      return {
        success: true,
        data: {
          content: csvContent,
          filename,
          totalRecords: invitations.length,
        },
      };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File, config: CSVProcessingConfig): ServiceResponse<void> {
    const errors: string[] = [];

    // Check file type
    if (!file.type.includes('csv') && !file.type.includes('text') && !file.name.endsWith('.csv')) {
      errors.push('File must be a CSV file (.csv)');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File cannot be empty');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(', '),
      };
    }

    return { success: true };
  }

  /**
   * Parse file using Papa Parse
   */
  private parseFile(
    file: File,
    config: CSVProcessingConfig,
  ): Promise<
    ServiceResponse<{
      data: Record<string, any>[];
      meta: Papa.ParseMeta;
    }>
  > {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: config.skipEmptyRows,
        trimHeaders: config.trimHeaders,
        delimiter: '', // Auto-detect from allowed delimiters
        encoding: config.encoding,
        preview: config.maxRows, // Limit number of rows
        complete: (results) => {
          if (results.errors.length > 0) {
            const criticalErrors = results.errors.filter(
              (error) => error.type === 'Delimiter' || error.type === 'Quotes',
            );

            if (criticalErrors.length > 0) {
              resolve({
                success: false,
                error: `CSV parsing errors: ${criticalErrors.map((e) => e.message).join(', ')}`,
              });
              return;
            }
          }

          // Check if we hit the row limit
          if (results.data.length >= config.maxRows) {
            resolve({
              success: false,
              error: `File contains more than ${config.maxRows} rows. Please split your file and try again.`,
            });
            return;
          }

          resolve({
            success: true,
            data: {
              data: results.data as Record<string, any>[],
              meta: results.meta,
            },
          });
        },
        error: (error) => {
          resolve({
            success: false,
            error: `CSV parsing failed: ${error.message}`,
          });
        },
      });
    });
  }

  /**
   * Get processing statistics for a batch
   */
  async getBatchProcessingStats(batchId: string): Promise<
    ServiceResponse<{
      total: number;
      pending: number;
      sent: number;
      accepted: number;
      failed: number;
      expired: number;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('status')
        .eq('batch_id', batchId);

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      const invitations = data || [];
      const stats = {
        total: invitations.length,
        pending: invitations.filter((inv) => inv.status === 'pending').length,
        sent: invitations.filter((inv) => inv.status === 'sent').length,
        accepted: invitations.filter((inv) => inv.status === 'accepted').length,
        failed: invitations.filter((inv) => inv.status === 'failed').length,
        expired: invitations.filter((inv) => inv.status === 'expired').length,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }
}
