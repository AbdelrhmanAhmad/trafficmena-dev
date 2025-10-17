import { supabase } from '@/shared/integrations/supabase/client';
import { AppErrorHandler } from '@/shared/utils/errorHandling';
import { SafeCast } from '@/utils/typeValidation';
import type {
  CreateBulkInvitationsFormData,
  CreateInvitationFormData,
  Invitation,
  InvitationFilters,
  InvitationStatistics,
  PaginatedInvitations,
  ServiceResponse,
} from '../types';
import { TokenGenerator } from '../utils/tokenGenerator';

/**
 * InvitationService
 * Simplified invitation CRUD for the MVP scope.
 */
export class InvitationService {
  private static instance: InvitationService;

  static getInstance(): InvitationService {
    if (!InvitationService.instance) {
      InvitationService.instance = new InvitationService();
    }
    return InvitationService.instance;
  }

  /**
   * Create a single invitation record.
   */
  async createSingleInvitation(
    data: CreateInvitationFormData,
    createdBy: string,
    customMessage?: string,
    source: Invitation['source'] = 'single',
  ): Promise<ServiceResponse<Invitation>> {
    try {
      const existing = await this.checkExistingInvitation(data.email);
      if (existing) {
        return {
          success: false,
          error: 'An invitation has already been sent to this email address',
        };
      }

      const insertPayload = this.buildInvitationPayload(data, createdBy, customMessage, source);
      const { data: invitation, error } = await supabase
        .from('invitations')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return {
        success: true,
        data: invitation as Invitation,
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
   * Bulk create invitations. Returns successful rows plus any failed addresses.
   */
  async createBulkInvitations(
    payload: CreateBulkInvitationsFormData,
    createdBy: string,
  ): Promise<ServiceResponse<{ invitations: Invitation[]; failed: string[] }>> {
    try {
      const failed: string[] = [];
      const invitations: Invitation[] = [];

      for (const invitationData of payload.invitations) {
        const result = await this.createSingleInvitation(
          invitationData,
          createdBy,
          invitationData.custom_message,
          payload.source,
        );
        if (result.success && result.data) {
          invitations.push(result.data);
        } else {
          failed.push(invitationData.email);
        }
      }

      return {
        success: true,
        data: { invitations, failed },
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
   * Retrieve a paginated list of invitations.
   */
  async getInvitations(
    page = 1,
    limit = 10,
    filters?: InvitationFilters,
  ): Promise<ServiceResponse<PaginatedInvitations>> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('invitations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters?.search) {
        const search = filters.search.trim();
        query = query.or(
          `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      const safeInvitations = SafeCast.toArray(data, []) as Invitation[];
      const total = count ?? safeInvitations.length;

      return {
        success: true,
        data: {
          invitations: safeInvitations,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
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
   * Fetch invitation by token (public flow).
   */
  async getInvitationByToken(token: string): Promise<ServiceResponse<Invitation | null>> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return {
        success: true,
        data: (data as Invitation) ?? null,
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
   * Accept invitation token by delegating to the database RPC.
   */
  async acceptInvitation(token: string, _userId: string): Promise<ServiceResponse<null>> {
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_token: token,
      });

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      const success = Boolean((data as { success?: boolean })?.success ?? true);

      return success
        ? { success: true, data: null }
        : { success: false, error: 'Unable to accept invitation. Please try again.' };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Resend invitation (marks as sent again).
   */
  async resendInvitation(invitationId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return { success: true, data: null };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Cancel invitation by marking it expired.
   */
  async cancelInvitation(invitationId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return { success: true, data: null };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Permanently delete an invitation.
   */
  async deleteInvitation(invitationId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', invitationId);
      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }
      return { success: true, data: null };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Simple invitation statistics grouped by status.
   */
  async getInvitationStatistics(): Promise<ServiceResponse<InvitationStatistics>> {
    try {
      const { data, error } = await supabase.from('invitations').select('status');

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      const stats: InvitationStatistics = {
        total: data?.length ?? 0,
        pending: 0,
        sent: 0,
        accepted: 0,
        expired: 0,
        failed: 0,
      };

      for (const row of data ?? []) {
        switch (row.status) {
          case 'pending':
            stats.pending += 1;
            break;
          case 'sent':
            stats.sent += 1;
            break;
          case 'accepted':
            stats.accepted += 1;
            break;
          case 'expired':
            stats.expired += 1;
            break;
          case 'failed':
            stats.failed += 1;
            break;
          default:
            break;
        }
      }

      return { success: true, data: stats };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private async checkExistingInvitation(email: string): Promise<Invitation | null> {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .in('status', ['pending', 'sent'])
      .maybeSingle();

    return (data as Invitation) ?? null;
  }

  private buildInvitationPayload(
    data: CreateInvitationFormData,
    createdBy: string,
    customMessage: string | undefined,
    source: Invitation['source'],
  ) {
    const token = TokenGenerator.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      email: data.email.toLowerCase().trim(),
      first_name: data.first_name?.trim() || null,
      last_name: data.last_name?.trim() || null,
      token,
      status: 'pending' as const,
      source,
      custom_message: customMessage || data.custom_message || null,
      created_by: createdBy,
      expires_at: expiresAt.toISOString(),
    };
  }
}

export const invitationService = InvitationService.getInstance();
