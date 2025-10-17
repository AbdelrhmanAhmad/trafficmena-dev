import { AppErrorHandler } from '@/shared/utils/errorHandling';
import type {
  EmailTemplateData,
  Invitation,
  PlunkContact,
  PlunkEmailData,
  PlunkWebhookEvent,
  RateLimitInfo,
  ServiceResponse,
} from '../types';

/**
 * Plunk Email Service
 * Handles integration with Plunk API for sending transactional emails
 * Implements rate limiting and error handling
 */
export class PlunkEmailService {
  private static instance: PlunkEmailService;
  private readonly rateLimitInfo: RateLimitInfo | null = null;

  private constructor() {
    // Client no longer reads or holds any email provider secrets.
    // Email sending is handled server-side via API endpoints.
  }

  static getInstance(): PlunkEmailService {
    if (!PlunkEmailService.instance) {
      PlunkEmailService.instance = new PlunkEmailService();
    }
    return PlunkEmailService.instance;
  }

  /**
   * Send invitation email to a single recipient
   */
  async sendInvitationEmail(
    invitation: Invitation,
    templateData: EmailTemplateData,
  ): Promise<ServiceResponse<string>> {
    try {
      // Client does not hold secrets; server handles email delivery.
      // Proceed to call backend endpoint for sending.

      // Check rate limits before sending
      if (!this.canSendEmail()) {
        return {
          success: false,
          error: `Rate limit exceeded. Try again after ${this.rateLimitInfo?.resetTime}`,
        };
      }

      // Load and process email template with personalization
      const emailBody = await this.processEmailTemplate(templateData);

      // Simplified email data matching Plunk API documentation
      const emailData = {
        to: invitation.email,
        subject: `You're Invited to Join TrafficMENA!`,
        body: emailBody,
        // Optional fields
        name: 'TrafficMENA', // Sender name
        from: 'hello@trafficmena.com', // Must be verified in Plunk
        reply: 'support@trafficmena.com',
      };

      const response = await this.makeBackendRequest('/api/mailer/send-invitation', 'POST', {
        invitation,
        emailData,
        templateData,
      });

      if (response.success) {
        return {
          success: true,
          data: response.data?.emails?.[0]?.id || 'sent',
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to send invitation email',
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
   * Create or update contact in Plunk
   */
  async createContact(
    email: string,
    firstName?: string,
    lastName?: string,
    metadata?: Record<string, any>,
  ): Promise<ServiceResponse<PlunkContact>> {
    try {
      const contactData: PlunkContact = {
        email,
        firstName,
        lastName,
        metadata: {
          source: 'TrafficMENA',
          created_at: new Date().toISOString(),
          ...metadata,
        },
      };

      const response = await this.makeBackendRequest(
        '/api/mailer/create-contact',
        'POST',
        contactData,
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to create contact',
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
   * Handle webhook events from Plunk
   */
  async handleWebhook(event: PlunkWebhookEvent): Promise<ServiceResponse<void>> {
    try {
      // Process different event types
      switch (event.type) {
        case 'sent':
          // Email was sent successfully
          await this.logEvent('email_sent', event);
          break;

        case 'delivered':
          // Email was delivered to recipient
          await this.logEvent('email_delivered', event);
          break;

        case 'opened':
          // Recipient opened the email
          await this.logEvent('email_opened', event);
          break;

        case 'clicked':
          // Recipient clicked a link in the email
          await this.logEvent('email_clicked', event);
          break;

        case 'bounced':
          // Email bounced
          await this.logEvent('email_bounced', event);
          break;

        case 'complained':
          // Recipient marked as spam
          await this.logEvent('email_complained', event);
          break;

        default:
      }

      return { success: true };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        error: AppErrorHandler.getFriendlyErrorMessage(appError),
      };
    }
  }

  /**
   * Check if we can send email (rate limiting)
   * Plunk allows 100 emails/minute
   */
  private canSendEmail(): boolean {
    if (!this.rateLimitInfo) {
      return true; // First request, assume we can send
    }

    // Check if rate limit has reset
    if (new Date() >= this.rateLimitInfo.resetTime) {
      this.rateLimitInfo = null;
      return true;
    }

    // Check if we have remaining requests
    return this.rateLimitInfo.remaining > 0;
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const limit = parseInt(headers.get('X-RateLimit-Limit') || '100');
    const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '100');
    const resetTime = headers.get('X-RateLimit-Reset');

    if (resetTime) {
      this.rateLimitInfo = {
        limit,
        remaining,
        resetTime: new Date(parseInt(resetTime) * 1000),
      };
    }
  }

  /**
   * Make authenticated request to Plunk API
   */
  private async makeBackendRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
  ): Promise<ServiceResponse<any>> {
    try {
      const url = endpoint; // relative backend endpoint (same origin)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || responseData.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Process email template with data
   */
  private async processEmailTemplate(templateData: EmailTemplateData): Promise<string> {
    // Build the greeting with proper personalization
    const fullName = [templateData.firstName, templateData.lastName].filter(Boolean).join(' ');
    const greeting = fullName ? `Hi ${fullName}!` : 'Hi there!';

    // Use firstName for personal touch, fallback to 'Friend' if not available
    const personalName = templateData.firstName || 'Friend';

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to TrafficMENA</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #101010, #05ef62); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited to TrafficMENA!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #101010; margin-top: 0;">${greeting}</h2>
            
            <p>You've been invited to join <strong>TrafficMENA</strong>, the premier digital marketing education platform for the Middle East and North Africa region.</p>
            
            ${templateData.customMessage ? `<div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #05ef62; margin: 20px 0;"><p style="margin: 0; font-style: italic;">${templateData.customMessage}</p></div>` : ''}
            
            <p>TrafficMENA connects aspiring marketers with industry experts through:</p>
            <ul style="margin: 20px 0;">
              <li>Professional workshops and seminars</li>
              <li>Comprehensive knowledge library</li>
              <li>Expert-led training programs</li>
              <li>Networking opportunities</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${templateData.invitationUrl}" style="background: linear-gradient(135deg, #05ef62, #29cf9f); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Accept Invitation</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This invitation will expire in 7 days. If you have any questions, please contact us at 
              <a href="mailto:support@trafficmena.com" style="color: #05ef62;">support@trafficmena.com</a>
            </p>
            
            ${templateData.unsubscribeUrl ? `<p style="color: #999; font-size: 12px; margin-top: 20px;"><a href="${templateData.unsubscribeUrl}" style="color: #999;">Unsubscribe</a> from future emails</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; 2024 TrafficMENA. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Log webhook event for tracking
   */
  private async logEvent(eventType: string, event: PlunkWebhookEvent): Promise<void> {
    // This would typically log to your database or analytics service
    // Currently disabled - implement database logging here if needed
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Test API connection and credentials
   */
  async testConnection(): Promise<ServiceResponse<boolean>> {
    try {
      const response = await this.makeRequest('/contacts', 'GET');
      return {
        success: response.success,
        data: response.success,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to Plunk API',
      };
    }
  }
}
