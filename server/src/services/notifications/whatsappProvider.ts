export type WhatsAppSendInput = {
  toE164: string;
  bodyText: string;
  templateId?: string | null;
  locale?: 'en' | 'ar';
};

export type WhatsAppSendResult = {
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
  providerMessageId?: string | null;
};

export type WhatsAppProvider = {
  send(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
};

/** W11A stub: no HTTP, no env vars — always skip with provider_not_configured. */
export class UnconfiguredWhatsAppProvider implements WhatsAppProvider {
  async send(_input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    return {
      status: 'skipped',
      reason: 'provider_not_configured',
      providerMessageId: null,
    };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return new UnconfiguredWhatsAppProvider();
}
