import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_E164,
  WHATSAPP_URL,
} from '../../src/shared/constants/contact';
import { isWidgetHidden } from '../../src/shared/utils/floatingWhatsApp';

describe('contact details', () => {
  it('keeps the published contact values exact', () => {
    assert.equal(CONTACT_EMAIL, 'info@trafficmena.com');
    assert.equal(CONTACT_PHONE_E164, '+201505437979');
    assert.equal(WHATSAPP_URL, 'https://wa.me/201505437979');
  });
});

describe('contact and refund surface wiring', () => {
  it('registers both public routes before the catch-all', async () => {
    const appSource = await readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8');
    const contactRoute = appSource.indexOf('path="/contact"');
    const refundRoute = appSource.indexOf('path="/refund-policy"');
    const catchAllRoute = appSource.indexOf('path="*"');

    assert.ok(contactRoute >= 0);
    assert.ok(refundRoute >= 0);
    assert.ok(catchAllRoute > contactRoute);
    assert.ok(catchAllRoute > refundRoute);
  });

  it('links both public pages from the footer', async () => {
    const footerSource = await readFile(
      new URL('../../src/shared/components/layout/Footer.tsx', import.meta.url),
      'utf8',
    );

    assert.match(footerSource, /to="\/contact"/);
    assert.match(footerSource, /to="\/refund-policy"/);
  });

  it('keeps the refund guarantee and precedence terms visible', async () => {
    const policySource = await readFile(
      new URL('../../src/pages/RefundPolicy.tsx', import.meta.url),
      'utf8',
    );
    const legalEn = await readFile(
      new URL('../../src/shared/i18n/locales/en/legal.json', import.meta.url),
      'utf8',
    );

    assert.match(policySource, /useTranslation\('legal'\)/);
    assert.match(legalEn, /7-day guarantee/i);
    assert.match(legalEn, /full refund, no questions asked/i);
    assert.match(legalEn, /take precedence over this general policy/i);
    assert.match(legalEn, /does not state separate refund terms, this policy applies/i);
  });
});

describe('floating WhatsApp visibility', () => {
  it('hides the widget on the admin route and its descendants', () => {
    assert.equal(isWidgetHidden('/admin'), true);
    assert.equal(isWidgetHidden('/admin/users'), true);
  });

  it('shows the widget outside the exact admin boundary', () => {
    assert.equal(isWidgetHidden('/'), false);
    assert.equal(isWidgetHidden('/dashboard'), false);
    assert.equal(isWidgetHidden('/administrator'), false);
  });
});
