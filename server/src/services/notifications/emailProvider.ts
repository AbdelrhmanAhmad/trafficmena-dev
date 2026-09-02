import { sendRawTransactionalEmail } from '../email.js';

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
};

export type EmailSendResult = {
  providerMessageId: string | null;
};

export type EmailProvider = {
  send(input: EmailSendInput): Promise<EmailSendResult>;
};

export class ResendEmailProvider implements EmailProvider {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    return sendRawTransactionalEmail(input);
  }
}

let defaultEmailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!defaultEmailProvider) {
    defaultEmailProvider = new ResendEmailProvider();
  }
  return defaultEmailProvider;
}
