import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveLocalizedText, resolveOptionalLocalizedText } from '../../server/src/utils/localize.js';
import { parseAppLocale, resolveLocaleFromRequest, DEFAULT_LOCALE } from '../../server/src/utils/locale.js';
import { mapPublicTitleDescription } from '../../server/src/utils/contentMappers.js';

describe('parseAppLocale', () => {
  it('accepts en and ar', () => {
    assert.equal(parseAppLocale('en'), 'en');
    assert.equal(parseAppLocale('ar'), 'ar');
    assert.equal(parseAppLocale('ar-EG'), 'ar');
    assert.equal(parseAppLocale('en-US'), 'en');
  });

  it('rejects unknown locales', () => {
    assert.equal(parseAppLocale('fr'), null);
    assert.equal(parseAppLocale(''), null);
  });
});

describe('resolveLocalizedText', () => {
  it('returns requested locale first', () => {
    assert.equal(resolveLocalizedText('Hello', 'مرحبا', 'en'), 'Hello');
    assert.equal(resolveLocalizedText('Hello', 'مرحبا', 'ar'), 'مرحبا');
  });

  it('falls back to the other language when primary is empty', () => {
    assert.equal(resolveLocalizedText('', 'مرحبا', 'en'), 'مرحبا');
    assert.equal(resolveLocalizedText('Hello', '', 'ar'), 'Hello');
  });

  it('preserves Unicode and HTML without mutation', () => {
    const html = '<p>مرحبا <strong>world</strong></p>';
    assert.equal(resolveLocalizedText('en', html, 'ar'), html);
  });
});

describe('mapPublicTitleDescription', () => {
  it('resolves localized public fields', () => {
    const mapped = mapPublicTitleDescription(
      {
        titleEn: 'Traffic Conference',
        titleAr: 'مؤتمر المرور',
        descriptionEn: '<p>English</p>',
        descriptionAr: '<p>عربي</p>',
      },
      'ar',
    );
    assert.equal(mapped.title, 'مؤتمر المرور');
    assert.equal(mapped.description, '<p>عربي</p>');
  });
});

describe('migration backfill semantics', () => {
  it('copies legacy value to both EN and AR', () => {
    const legacyTitle = 'Traffic Conference';
    const backfilled = {
      titleEn: legacyTitle,
      titleAr: legacyTitle,
    };
    assert.equal(backfilled.titleEn, legacyTitle);
    assert.equal(backfilled.titleAr, legacyTitle);
  });

  it('copies Arabic legacy text to both languages', () => {
    const legacyTitle = 'مؤتمر المرور';
    const backfilled = {
      titleEn: legacyTitle,
      titleAr: legacyTitle,
    };
    assert.equal(backfilled.titleEn, legacyTitle);
    assert.equal(backfilled.titleAr, legacyTitle);
  });

  it('preserves NULL as NULL in optional fields', () => {
    const legacyDescription: string | null = null;
    const backfilled = {
      descriptionEn: legacyDescription,
      descriptionAr: legacyDescription,
    };
    assert.equal(backfilled.descriptionEn, null);
    assert.equal(backfilled.descriptionAr, null);
    assert.equal(
      resolveOptionalLocalizedText(backfilled.descriptionEn, backfilled.descriptionAr, 'en'),
      null,
    );
  });
});

describe('resolveLocaleFromRequest', () => {
  it('defaults to en without signals', () => {
    const c = {
      req: {
        query: () => undefined,
        header: () => undefined,
      },
    };
    assert.equal(resolveLocaleFromRequest(c as never), DEFAULT_LOCALE);
  });

  it('prefers lang query param', () => {
    const c = {
      req: {
        query: (key: string) => (key === 'lang' ? 'ar' : undefined),
        header: () => undefined,
      },
    };
    assert.equal(resolveLocaleFromRequest(c as never), 'ar');
  });
});
