import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildVerifiedPaymentAnalytics,
  normalizeAnalyticsPaymentMethod,
} from '../../server/src/routes/api/paymentAnalyticsHelpers';
import { completeSignInVerification, requestSignInCode } from '../../src/app/auth/signIn';
import { getCurrentSubscriptionQueryKey, getCurrentUserQueryKey } from '../../src/app/queryKeys';
import {
  resolveCalculatorResultReady,
  shouldTrackCalculatorPointerInteraction,
  shouldTrackCalculatorUsage,
} from '../../src/features/calculators/analytics-shared';
import { resolveTrackBookingItemName } from '../../src/features/tracks/trackBookingAnalytics';
import { resolveTrackCalendarAnalyticsEvent } from '../../src/lib/analytics/calendar';
import {
  buildEventDiscoveryItem,
  buildTrackDiscoveryItem,
  isCanonicalDiscoveryListPath,
} from '../../src/lib/analytics/contentDiscovery';
import {
  buildBeginCheckoutEvent,
  buildPurchaseEvents,
  buildSubscribeEvent,
} from '../../src/lib/analytics/events';
import {
  buildGlobalVariablesPayload,
  getGlobalVariablesTrackingKey,
  getPageType,
  isGlobalVariablesContextReady,
  normalizeAnalyticsPaymentMethod as normalizeClientAnalyticsPaymentMethod,
  toAnalyticsItemType,
} from '../../src/lib/analytics/helpers';
import {
  resolveLibrarySeriesContext,
  shouldTrackInlineLibraryContent,
} from '../../src/lib/analytics/libraryContent';
import {
  buildCheckoutAnalyticsItem,
  getAmountCentsFromUnits,
  getAnalyticsItemCategory,
  getAnalyticsItemId,
  getAnalyticsItemName,
  getBeginCheckoutValue,
  getBeginCheckoutValueFromAvailablePricing,
  getPurchaseItemCategory,
  getSelectPaymentMethodValueFromAvailablePricing,
  isVerifiedPaymentAnalyticsReady,
  SUBSCRIPTION_ANALYTICS_ITEM_NAME,
  shouldTrackStandaloneCheckoutEntry,
} from '../../src/lib/analytics/paymentFlow';
import { getProfileCompletion, getUpdatedProfileFields } from '../../src/lib/analytics/profile';
import { buildCompletedSignUpTrackingParams } from '../../src/lib/analytics/signup';

describe('session-scoped query keys', () => {
  it('scopes current-user queries by authenticated user id', () => {
    assert.deepEqual(getCurrentUserQueryKey('user-a'), ['current-user', 'user-a']);
    assert.deepEqual(getCurrentUserQueryKey('user-b'), ['current-user', 'user-b']);
    assert.notDeepEqual(getCurrentUserQueryKey('user-a'), getCurrentUserQueryKey('user-b'));
  });

  it('scopes current-subscription queries by authenticated user id', () => {
    assert.deepEqual(getCurrentSubscriptionQueryKey('user-a'), ['current-subscription', 'user-a']);
    assert.deepEqual(getCurrentSubscriptionQueryKey('user-b'), ['current-subscription', 'user-b']);
    assert.notDeepEqual(
      getCurrentSubscriptionQueryKey('user-a'),
      getCurrentSubscriptionQueryKey('user-b'),
    );
  });
});

describe('global_variables payload gating', () => {
  it('does not treat a logged-in page as ready when user context failed to load', () => {
    assert.equal(
      isGlobalVariablesContextReady({
        authLoading: false,
        user: { id: 'usr_1', email: 'member@example.com' },
        currentUserReady: false,
        subscriptionReady: true,
      }),
      false,
    );
  });

  it('waits for user-scoped data before building a logged-in payload', () => {
    const payload = buildGlobalVariablesPayload({
      pathname: '/dashboard',
      authLoading: false,
      user: { id: 'usr_1', email: 'member@example.com' },
      profile: null,
      totalPaidPurchases: 0,
      totalRegistrations: 0,
      totalRevenue: 0,
      accountCreationDate: '',
      subscriptionStatus: null,
      currentUserReady: false,
      subscriptionReady: false,
    });

    assert.equal(payload, null);
  });

  it('builds a stable logged-in payload once user data is ready', () => {
    const payload = buildGlobalVariablesPayload({
      pathname: '/dashboard',
      authLoading: false,
      user: { id: 'usr_1', email: 'member@example.com' },
      profile: {
        role: 'user',
        phone_number: '+20 101 234 5678',
        first_name: 'Mona',
        last_name: 'Ali',
      },
      totalPaidPurchases: 2,
      totalRegistrations: 3,
      totalRevenue: 750,
      accountCreationDate: '2026-01-15T10:30:00.000Z',
      subscriptionStatus: 'active',
      currentUserReady: true,
      subscriptionReady: true,
    });

    assert.deepEqual(payload, {
      event: 'global_variables',
      user_id: 'usr_1',
      login_status: 'logged_in',
      user_role: 'user',
      subscription_status: 'active',
      customer_type: 'returning',
      event_source: 'Web',
      page_type: 'dashboard',
      page_path: '/dashboard',
      currency: 'EGP',
      total_registrations: 3,
      total_purchases: 2,
      total_revenue: 750,
      account_creation_date: '2026-01-15T10:30:00.000Z',
      email: 'member@example.com',
      phone: '201012345678',
      first_name: 'Mona',
      last_name: 'Ali',
    });
  });

  it('keeps guest customer_type aligned with the documented free-member state', () => {
    const payload = buildGlobalVariablesPayload({
      pathname: '/',
      authLoading: false,
      user: null,
      profile: null,
      totalPaidPurchases: 0,
      totalRegistrations: 0,
      totalRevenue: 0,
      accountCreationDate: '',
      subscriptionStatus: null,
      currentUserReady: true,
      subscriptionReady: true,
    });

    assert.equal(payload?.login_status, 'guest');
    assert.equal(payload?.customer_type, 'free');
  });

  it('keeps the tracking key stable for same-page data refreshes', () => {
    assert.equal(
      getGlobalVariablesTrackingKey('/dashboard/profile', 'nav-profile'),
      getGlobalVariablesTrackingKey('/dashboard/profile', 'nav-profile'),
    );
  });

  it('changes the tracking key when the route changes within the same page type', () => {
    assert.notEqual(
      getGlobalVariablesTrackingKey('/meetups/event-a'),
      getGlobalVariablesTrackingKey('/meetups/event-b'),
    );
  });

  it('changes the tracking key when a new navigation reaches the same route', () => {
    assert.notEqual(
      getGlobalVariablesTrackingKey('/dashboard/profile', 'nav-a'),
      getGlobalVariablesTrackingKey('/dashboard/profile', 'nav-b'),
    );
  });

  it('maps the legacy profile edit route to the dashboard profile page type', () => {
    assert.equal(getPageType('/profile/edit'), 'dashboard_profile');
  });
});

describe('calculator analytics gating', () => {
  it('does not infer calculator readiness from an omitted shareDisabled prop', () => {
    assert.equal(
      resolveCalculatorResultReady({
        hasExplicitShareDisabled: false,
      }),
      false,
    );
  });

  it('does not treat opening a select trigger as a completed calculator interaction', () => {
    assert.equal(shouldTrackCalculatorPointerInteraction({ role: 'combobox' }), false);
    assert.equal(shouldTrackCalculatorPointerInteraction({ role: 'option' }), true);
    assert.equal(shouldTrackCalculatorPointerInteraction({ isRadixCollectionItem: true }), true);
  });

  it('does not track calculator usage before the member interacts with the calculator', () => {
    assert.equal(
      shouldTrackCalculatorUsage({
        hasInteracted: false,
        hasValidResult: true,
        alreadyTracked: false,
      }),
      false,
    );
  });

  it('tracks calculator usage once a valid result exists after interaction', () => {
    assert.equal(
      shouldTrackCalculatorUsage({
        hasInteracted: true,
        hasValidResult: true,
        alreadyTracked: false,
      }),
      true,
    );
  });
});

describe('discovery page gating', () => {
  it('tracks canonical list discovery only on the public meetups listing page', () => {
    assert.equal(isCanonicalDiscoveryListPath('/meetups'), true);
    assert.equal(isCanonicalDiscoveryListPath('/'), false);
    assert.equal(isCanonicalDiscoveryListPath('/dashboard/meetups'), false);
  });
});

describe('library content analytics', () => {
  it('tracks view_content for any accessible content regardless of type', () => {
    assert.equal(shouldTrackInlineLibraryContent({ has_access: true }), true);
    assert.equal(shouldTrackInlineLibraryContent({ has_access: false }), false);
    assert.equal(shouldTrackInlineLibraryContent(null), false);
  });

  it('preserves series context passed through navigation state', () => {
    assert.deepEqual(
      resolveLibrarySeriesContext({
        seriesContext: {
          id: 'series_123',
          title: 'Performance Marketing Mastery',
        },
      }),
      {
        seriesId: 'series_123',
        seriesName: 'Performance Marketing Mastery',
      },
    );
  });
});

describe('track calendar analytics', () => {
  it('uses the first real session for track calendar attribution', () => {
    assert.deepEqual(
      resolveTrackCalendarAnalyticsEvent([
        { id: 'evt_1', title: 'Intro Session' },
        { id: 'evt_2', title: 'Workshop' },
      ]),
      {
        itemId: 'evt_1',
        itemName: 'Intro Session',
      },
    );
  });

  it('returns null when a track has no valid session to attribute', () => {
    assert.equal(
      resolveTrackCalendarAnalyticsEvent([
        { id: '', title: 'Untitled' },
        { id: 'evt_2', title: '   ' },
      ]),
      null,
    );
  });
});

describe('content discovery item builders', () => {
  it('builds event list items with canonical discovery fields', () => {
    assert.deepEqual(
      buildEventDiscoveryItem(
        {
          id: 'evt_1',
          title: 'Advanced Google Ads Workshop',
          event_type: 'Mastermind',
          price_in_cents: 25000,
          image_url: 'https://cdn.example.com/event.png',
        },
        2,
      ),
      {
        item_id: 'evt_1',
        item_name: 'Advanced Google Ads Workshop',
        item_category: 'Mastermind',
        price: 250,
        currency: 'EGP',
        item_image_link: 'https://cdn.example.com/event.png',
        item_link: '/meetups/evt_1',
        index: 2,
      },
    );
  });

  it('builds track list items with the Track category', () => {
    assert.deepEqual(
      buildTrackDiscoveryItem(
        {
          id: 'trk_1',
          title: 'Growth Track',
          price_in_cents: 0,
        },
        0,
      ),
      {
        item_id: 'trk_1',
        item_name: 'Growth Track',
        item_category: 'Track',
        price: 0,
        currency: 'EGP',
        item_link: '/tracks/trk_1',
        index: 0,
      },
    );
  });
});

describe('payment analytics schema mapping', () => {
  it('maps app payment item types to the approved analytics item types', () => {
    assert.equal(toAnalyticsItemType('event'), 'event_ticket');
    assert.equal(toAnalyticsItemType('track'), 'track_booking');
    assert.equal(toAnalyticsItemType('subscription'), 'subscription');
  });

  it('uses the original price for begin_checkout when a discount is applied', () => {
    assert.equal(
      getBeginCheckoutValue({
        amountCents: 20000,
        originalAmountCents: 25000,
      }),
      250,
    );
  });

  it('falls back to the known base price when checkout opens before preview resolves', () => {
    assert.equal(getBeginCheckoutValueFromAvailablePricing(undefined, 25000), 250);
  });

  it('tracks standalone begin_checkout only after checkout intent is shown', () => {
    assert.equal(
      shouldTrackStandaloneCheckoutEntry({
        selectedMethodId: null,
        alreadyTracked: false,
      }),
      false,
    );

    assert.equal(
      shouldTrackStandaloneCheckoutEntry({
        selectedMethodId: 7,
        alreadyTracked: false,
      }),
      true,
    );
  });

  it('falls back to the base amount when select_payment_method fires before preview resolves', () => {
    assert.equal(getSelectPaymentMethodValueFromAvailablePricing(undefined, 25000), 250);
  });

  it('converts subscriptionInfo EGP units into integer cents for analytics fallbacks', () => {
    assert.equal(getAmountCentsFromUnits(2500), 250000);
  });

  it('normalizes checkout item categories to canonical analytics values', () => {
    assert.equal(getAnalyticsItemCategory('event', 'Mastermind'), 'Mastermind');
    assert.equal(getAnalyticsItemCategory('track'), 'Track');
    assert.equal(getAnalyticsItemCategory('subscription'), 'Subscription');
  });

  it('uses the canonical subscription item id for checkout-stage events', () => {
    assert.equal(getAnalyticsItemId('subscription'), 'subscription_annual');
  });

  it('uses the canonical subscription item name for checkout-stage events', () => {
    assert.equal(getAnalyticsItemName('subscription'), SUBSCRIPTION_ANALYTICS_ITEM_NAME);
  });

  it('builds checkout item metadata consistently for subscription flows', () => {
    assert.deepEqual(
      buildCheckoutAnalyticsItem({
        itemType: 'subscription',
        value: 2500,
      }),
      {
        item_id: 'subscription_annual',
        item_name: 'TrafficMENA Annual Subscription',
        item_category: 'Subscription',
        price: 2500,
        currency: 'EGP',
      },
    );
  });

  it('builds begin_checkout with canonical item_type values', () => {
    const event = buildBeginCheckoutEvent({
      currency: 'EGP',
      value: 250,
      itemType: 'event',
      item: {
        item_id: 'evt_1',
        item_name: 'Workshop',
        item_category: 'Mastermind',
        price: 250,
        currency: 'EGP',
      },
    });

    assert.equal(event.item_type, 'event_ticket');
  });

  it('builds purchase and first_purchase using prior non-subscription purchases', () => {
    const events = buildPurchaseEvents({
      transactionId: 'pay_1',
      currency: 'EGP',
      value: 200,
      itemType: 'event',
      paymentType: 'fawry',
      priorNonSubscriptionPurchases: 0,
      coupon: 'SUMMER25',
      discount: 50,
      originalValue: 250,
      item: {
        item_id: 'evt_1',
        item_name: 'Workshop',
        item_category: 'Mastermind',
        price: 200,
        currency: 'EGP',
        quantity: 1,
      },
    });

    assert.equal(events.length, 2);
    assert.equal(events[0]?.event, 'purchase');
    assert.equal(events[0]?.item_type, 'event_ticket');
    assert.equal(events[0]?.customer_type, 'new');
    assert.equal(events[1]?.event, 'first_purchase');
  });

  it('waits for a complete event payment verification payload before tracking purchase', () => {
    assert.equal(
      isVerifiedPaymentAnalyticsReady({
        status: 'paid',
        paymentId: 'pay_1',
        itemType: 'event',
        itemId: 'evt_1',
        amountCents: 25000,
        itemName: '',
        itemCategory: 'Meetup',
      }),
      false,
    );
  });

  it('accepts a complete subscription payment verification payload', () => {
    assert.equal(
      isVerifiedPaymentAnalyticsReady({
        status: 'paid',
        paymentId: 'pay_1',
        itemType: 'subscription',
        amountCents: 250000,
        priorPaidPurchases: 0,
      }),
      true,
    );
  });

  it('builds subscribe using all prior paid purchases', () => {
    const event = buildSubscribeEvent({
      transactionId: 'pay_2',
      currency: 'EGP',
      value: 1875,
      paymentType: 'meeza',
      priorPaidPurchases: 1,
      coupon: 'SUBSCRIBE25',
      discount: 625,
      originalValue: 2500,
    });

    assert.equal(event.item_type, 'subscription');
    assert.equal(event.payment_type, 'meeza');
    assert.equal(event.customer_type, 'returning');
    assert.equal(event.coupon, 'SUBSCRIBE25');
    assert.equal(event.discount, 625);
    assert.equal(event.original_value, 2500);
  });
});

describe('verified payment analytics metadata', () => {
  it('normalizes gateway payment method names to analytics-safe values', () => {
    assert.equal(normalizeAnalyticsPaymentMethod('Meeza QR'), 'meeza_qr');
    assert.equal(normalizeAnalyticsPaymentMethod(' Mobile Wallet '), 'mobile_wallet');
    assert.equal(normalizeAnalyticsPaymentMethod(''), '');
  });

  it('keeps client payment method normalization aligned with the server', () => {
    assert.equal(normalizeClientAnalyticsPaymentMethod('Meeza QR'), 'meeza_qr');
    assert.equal(normalizeClientAnalyticsPaymentMethod(' Mobile Wallet '), 'mobile_wallet');
  });

  it('builds prior-purchase metadata without reusing the current payment', () => {
    const analytics = buildVerifiedPaymentAnalytics({
      amountCents: 20000,
      itemType: 'event',
      itemName: 'Attribution Workshop',
      itemCategory: 'Mastermind',
      paymentMethod: 'Fawry',
      promoCode: 'SUMMER25',
      originalAmountCents: 25000,
      discountAppliedCents: 5000,
      priorPaidPurchases: 1,
      priorNonSubscriptionPurchases: 0,
    });

    assert.equal(analytics.itemName, 'Attribution Workshop');
    assert.equal(analytics.itemCategory, 'Mastermind');
    assert.equal(analytics.paymentType, 'fawry');
    assert.equal(analytics.promoCode, 'SUMMER25');
    assert.equal(analytics.originalAmountCents, 25000);
    assert.equal(analytics.discountAppliedCents, 5000);
    assert.equal(analytics.priorPaidPurchases, 1);
    assert.equal(analytics.priorNonSubscriptionPurchases, 0);
  });
});

describe('signin analytics flow helpers', () => {
  it('fires login_start before the OTP request resolves or fails', async () => {
    const calls: string[] = [];

    await assert.rejects(
      requestSignInCode({
        email: 'Member@Example.com',
        requestOtp: async (email) => {
          calls.push(`requestOtp:${email}`);
          throw new Error('rate limited');
        },
        onLoginStart: () => {
          calls.push('login_start');
        },
      }),
    );

    assert.deepEqual(calls, ['login_start', 'requestOtp:member@example.com']);
  });

  it('uses the verified user id when refreshSession fails after OTP verification', async () => {
    const warnings: unknown[] = [];
    const result = await completeSignInVerification({
      email: 'Member@Example.com',
      otp: '123456',
      verifyOtp: async () => ({
        id: 'usr_verified',
        email: 'member@example.com',
        emailVerified: true,
        name: 'Member',
      }),
      refreshSession: async () => {
        throw new Error('session endpoint timed out');
      },
      onRefreshError: (error) => {
        warnings.push(error);
      },
    });

    assert.equal(result.normalizedEmail, 'member@example.com');
    assert.equal(result.userId, 'usr_verified');
    assert.equal(warnings.length, 1);
  });
});

describe('purchase item category resolution', () => {
  it('preserves a verified payment item category from the server', () => {
    assert.equal(getPurchaseItemCategory('event', 'Mastermind'), 'Mastermind');
  });

  it('falls back to Track for track purchases without a server category', () => {
    assert.equal(getPurchaseItemCategory('track', ''), 'Track');
  });
});

describe('track booking analytics metadata', () => {
  it('falls back to dashboard track detail data when public detail is not cached', () => {
    assert.equal(
      resolveTrackBookingItemName([
        {
          title: 'Performance Marketing Bootcamp',
        },
      ]),
      'Performance Marketing Bootcamp',
    );
  });

  it('still supports the public track detail cache shape', () => {
    assert.equal(
      resolveTrackBookingItemName([
        {
          track: {
            title: 'Growth Track',
          },
        },
      ]),
      'Growth Track',
    );
  });
});

describe('signup analytics identity resolution', () => {
  it('uses the verified auth user id for standard OTP signup completion', () => {
    const payload = buildCompletedSignUpTrackingParams({
      authUserId: 'usr_standard',
      email: 'NewUser@example.com',
      phone: '+20 101 234 5678',
      firstName: 'Mona',
      lastName: 'Ali',
    });

    assert.deepEqual(payload, {
      userId: 'usr_standard',
      email: 'newuser@example.com',
      phone: '+20 101 234 5678',
      firstName: 'Mona',
      lastName: 'Ali',
    });
  });

  it('falls back to the invited user id for invitation activation signup', () => {
    const payload = buildCompletedSignUpTrackingParams({
      invitationUserId: 'usr_invited',
      email: 'invitee@example.com',
      firstName: 'Aya',
      lastName: 'Nabil',
    });

    assert.equal(payload?.userId, 'usr_invited');
  });

  it('refuses to build a signup tracking payload without a real user id', () => {
    const payload = buildCompletedSignUpTrackingParams({
      email: 'missing@example.com',
    });

    assert.equal(payload, null);
  });
});

describe('profile analytics helpers', () => {
  it('reports only the fields whose saved values actually changed', () => {
    assert.equal(
      getUpdatedProfileFields(
        {
          firstName: 'Mona',
          lastName: 'Ali',
          email: 'mona@example.com',
          phone: '01012345678',
          primaryGoal: 'Grow pipeline',
          primaryChallenge: 'Attribution',
        },
        {
          firstName: 'Mona',
          lastName: 'Ali',
          email: 'mona@example.com',
          phone: '',
          primaryGoal: 'Grow pipeline',
          primaryChallenge: 'Budget pressure',
        },
      ),
      'phone,primary_challenge',
    );
  });

  it('calculates completion from the documented six profile fields', () => {
    assert.equal(
      getProfileCompletion({
        firstName: 'Mona',
        lastName: 'Ali',
        email: 'mona@example.com',
        phone: '',
        primaryGoal: 'Grow pipeline',
        primaryChallenge: '',
      }),
      67,
    );
  });
});
