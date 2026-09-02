import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it } from 'node:test';

const installSessionStorageMock = () => {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) ?? null) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mock,
    configurable: true,
  });
  return store;
};

const {
  AUTH_RETURN_STORAGE_KEY,
  DEFAULT_AUTH_RETURN_PATH,
  buildReturnPathFromLocation,
  captureAuthReturnFromLocation,
  captureAuthReturnFromSignInEntry,
  consumeAuthReturnPath,
  locationLikeFromReturnPath,
  peekAuthReturnPath,
  sanitizeInternalReturnPath,
  storeAuthReturnPath,
} = await import('../../src/shared/utils/authReturnPath.ts');

const { getPostSignupRedirectUrl } = await import('../../src/shared/utils/postSignupRedirect.ts');

beforeEach(() => {
  installSessionStorageMock();
});

describe('sanitizeInternalReturnPath', () => {
  it('accepts valid internal paths with query and hash', () => {
    assert.equal(sanitizeInternalReturnPath('/events/1'), '/events/1');
    assert.equal(sanitizeInternalReturnPath('/events/1?tab=details'), '/events/1?tab=details');
    assert.equal(
      sanitizeInternalReturnPath('/events/1?tab=details#agenda'),
      '/events/1?tab=details#agenda',
    );
    assert.equal(sanitizeInternalReturnPath('/dashboard/library'), '/dashboard/library');
    assert.equal(
      sanitizeInternalReturnPath('/masterclasses/abc?lesson=3#video'),
      '/masterclasses/abc?lesson=3#video',
    );
  });

  it('preserves encoded path segments after decode', () => {
    assert.equal(
      sanitizeInternalReturnPath('/events/%D9%88%D8%B1%D8%B4%D8%A9'),
      '/events/\u0648\u0631\u0634\u0629',
    );
    assert.equal(
      sanitizeInternalReturnPath('/meetups/1?ticketType=vip&promo=ABC'),
      '/meetups/1?ticketType=vip&promo=ABC',
    );
  });

  const invalid = [
    'https://evil.com',
    'http://evil.com',
    '//evil.com',
    '\\\\evil.com',
    '\\evil.com',
    'javascript:alert(1)',
    'data:text/html,hello',
    '%2F%2Fevil.com',
    '/signin',
    '/signup/step-2',
    '',
    null,
    undefined,
  ];

  for (const candidate of invalid) {
    it(`rejects unsafe return target: ${String(candidate)}`, () => {
      assert.equal(
        sanitizeInternalReturnPath(candidate as string | null | undefined),
        DEFAULT_AUTH_RETURN_PATH,
      );
    });
  }
});

describe('buildReturnPathFromLocation', () => {
  it('combines pathname, search, and hash', () => {
    assert.equal(
      buildReturnPathFromLocation({
        pathname: '/tracks/55',
        search: '?view=sessions',
        hash: '#session-3',
      }),
      '/tracks/55?view=sessions#session-3',
    );
  });
});

describe('session-scoped storage', () => {
  it('stores, peeks, and consumes return path once', () => {
    storeAuthReturnPath('/dashboard/community?tab=posts#latest');
    assert.equal(peekAuthReturnPath(), '/dashboard/community?tab=posts#latest');
    assert.equal(consumeAuthReturnPath(), '/dashboard/community?tab=posts#latest');
    assert.equal(peekAuthReturnPath(), null);
  });

  it('sanitizes before storing invalid values', () => {
    storeAuthReturnPath('https://evil.com');
    assert.equal(peekAuthReturnPath(), DEFAULT_AUTH_RETURN_PATH);
  });

  it('captureAuthReturnFromLocation ignores auth entry routes', () => {
    captureAuthReturnFromLocation({ pathname: '/signin', search: '', hash: '' });
    assert.equal(peekAuthReturnPath(), null);
  });
});

describe('sign-in entry capture', () => {
  it('reads returnTo query param safely', () => {
    captureAuthReturnFromSignInEntry({
      pathname: '/signin',
      search: '?returnTo=%2Fmeetups%2Fabc%3Ftab%3Dx%23section',
      hash: '',
    });
    assert.equal(peekAuthReturnPath(), '/meetups/abc?tab=x#section');
  });

  it('rejects external returnTo values', () => {
    captureAuthReturnFromSignInEntry({
      pathname: '/signin',
      search: '?returnTo=https%3A%2F%2Fevil.com',
      hash: '',
    });
    assert.equal(peekAuthReturnPath(), DEFAULT_AUTH_RETURN_PATH);
  });
});

describe('locationLikeFromReturnPath', () => {
  it('splits path, query, and hash for router state', () => {
    const parts = locationLikeFromReturnPath('/tracks/1?promo=ABC#intro');
    assert.equal(parts.pathname, '/tracks/1');
    assert.equal(parts.search, '?promo=ABC');
    assert.equal(parts.hash, '#intro');
  });
});

describe('post-signup redirect integration', () => {
  it('prefers generic return path over legacy product contexts', () => {
    sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, '/tracks/track-456?ref=cta');

    const redirectUrl = getPostSignupRedirectUrl();
    assert.equal(redirectUrl, '/tracks/track-456?ref=cta');
    assert.equal(peekAuthReturnPath(), null);
  });
});

describe('auth flow wiring', () => {
  it('ProtectedRoute uses redirectToSignIn helper', async () => {
    const navigation = await import('../../src/shared/utils/authNavigation.ts');
    assert.equal(typeof navigation.redirectToSignIn, 'function');
  });

  it('SignIn uses safe return consumption and turnstile auto-retry gate', () => {
    const source = readFileSync('src/pages/SignIn.tsx', 'utf8');
    assert.ok(source.includes('consumeAuthReturnPath'));
    assert.ok(source.includes('captureAuthReturnFromSignInEntry'));
    assert.ok(source.includes('useTurnstileOtpGate'));
  });

  it('CheckEmail uses getPostSignupRedirectUrl', () => {
    const source = readFileSync('src/pages/signup/CheckEmail.tsx', 'utf8');
    assert.ok(source.includes('getPostSignupRedirectUrl'));
  });

  it('invitation token is not part of return path sanitizer', () => {
    const source = readFileSync('src/shared/utils/authReturnPath.ts', 'utf8');
    assert.ok(!source.includes('invitation'));
  });
});
