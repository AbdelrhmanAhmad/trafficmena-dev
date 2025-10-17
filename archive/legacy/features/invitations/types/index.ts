/**
 * Invitation System Types
 * Simplified invitation definitions for the MVP flow
 */

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'failed';
export type InvitationSource = 'single' | 'csv';

export interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  token: string;
  status: InvitationStatus;
  source: InvitationSource;
  created_by: string | null;
  custom_message: string | null;
  expires_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationFormData {
  email: string;
  first_name?: string;
  last_name?: string;
  custom_message?: string;
}

export interface CreateBulkInvitationsFormData {
  invitations: CreateInvitationFormData[];
  batch_name?: string;
  source: InvitationSource;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedInvitations {
  invitations: Invitation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvitationFilters {
  status?: InvitationStatus;
  search?: string;
  created_by?: string;
}

export interface InvitationStatistics {
  total: number;
  pending: number;
  sent: number;
  accepted: number;
  expired: number;
  failed: number;
}

export interface CSVRowData {
  [key: string]: string | null;
}

export interface CSVProcessingSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingUsers: number;
  pendingInvitations: number;
}

export interface CSVProcessingSummaryResult {
  success: boolean;
  data?: {
    validInvitations: CreateInvitationFormData[];
    summary: CSVProcessingSummary;
  };
  error?: string;
}
