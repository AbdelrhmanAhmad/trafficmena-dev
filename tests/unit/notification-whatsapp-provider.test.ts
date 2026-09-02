import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getWhatsAppProvider,
  UnconfiguredWhatsAppProvider,
} from '../../server/src/services/notifications/whatsappProvider.ts';

describe('notification WhatsApp provider', () => {
  it('UnconfiguredWhatsAppProvider returns skipped + provider_not_configured', async () => {
    const provider = new UnconfiguredWhatsAppProvider();
    const result = await provider.send({
      toE164: '+201012345678',
      bodyText: 'hello',
      locale: 'en',
    });

    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'provider_not_configured');
    assert.equal(result.providerMessageId, null);
  });

  it('getWhatsAppProvider returns the unconfigured stub (no network)', async () => {
    const provider = getWhatsAppProvider();
    assert.ok(provider instanceof UnconfiguredWhatsAppProvider);

    const result = await provider.send({
      toE164: '+971501234567',
      bodyText: 'test',
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'provider_not_configured');
  });
});
