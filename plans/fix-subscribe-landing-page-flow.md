# Plan: Public Subscribe Landing Page for Non-Authenticated Users

## Problem Summary

The Subscribe button in the navbar is now visible to all users, but clicking it redirects non-authenticated users to signin instead of showing a public landing page with subscription information. Users should see the value proposition BEFORE being asked to sign up.

## Desired User Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Non-Authenticated User Flow                                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User sees "Subscribe" button in navbar                                  │
│     └── Visible to ALL users (authenticated and non-authenticated)         │
│                                                                             │
│  2. Clicks "Subscribe"                                                      │
│     └── Goes to PUBLIC landing page (/subscribe)                           │
│                                                                             │
│  3. Sees Landing Page with:                                                 │
│     ├── Section 1: Hero (text left, pricing card right)                    │
│     ├── Section 2: Testimonials (vertical videos/screenshots grid)         │
│     ├── Section 3: Premium Content (tracks/courses grid)                   │
│     ├── Section 4: CTA Reminder (subscribe benefits)                       │
│     └── Section 5: Footer                                                  │
│                                                                             │
│  4. Clicks "Subscribe Now"                                                  │
│     └── Stores subscription intent in localStorage                         │
│     └── Redirects to /signup?source=subscription                           │
│                                                                             │
│  5. Completes Signup Flow (Step 0-5, OTP verification)                     │
│     └── Shows subscription context card (like event context)               │
│                                                                             │
│  6. After Signup Complete                                                   │
│     └── Reads subscription intent from localStorage                        │
│     └── Redirects to /subscribe (now authenticated = payment page)         │
│                                                                             │
│  7. Selects Payment Method & Pays                                          │
│     └── Redirects to Fawaterk payment gateway                              │
│                                                                             │
│  8. Payment Success                                                         │
│     └── Redirects to /payment/success                                      │
│     └── Subscription activated!                                            │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Landing Page Structure (User Specified)

### Section 1: Hero Section
**Layout**: Two-column on desktop, stacked on mobile

| Left Side | Right Side |
|-----------|------------|
| **Headline**: Large, compelling title | **Pricing Card**: Rectangular card |
| **Subheadline**: Supporting text | - Annual price (only annual) |
| **Benefits list**: Key value props | - Key benefits summary |
| | - "Subscribe Now" CTA button |

### Section 2: Testimonials Section
**Layout**: Grid of testimonial cards

| Desktop | Mobile |
|---------|--------|
| 4 cards in grid | 3 cards (scrollable or stacked) |

**Card Types**:
- Vertical video cards (YouTube Shorts/testimonials)
- Squared screenshot cards with text

### Section 3: Premium Content Section
**Layout**: What subscribers get - Premium courses/tracks

| Content | Display |
|---------|---------|
| **Track 1**: Performance Marketing Track | Course image + bullet points |
| **Track 2**: Content Marketing Track | Course image + bullet points |
| (Expandable for future tracks/events) | |

**Grid Style**: Text on one side, course image on the other (alternating)

### Section 4: CTA Reminder Section
**Layout**: Final push to subscribe

- Benefits reminder (why premium is best)
- Subscribe CTA button
- Urgency/value reinforcement

### Section 5: Footer
Standard footer with links

---

## Pattern Reference: Event Signup Flow

The event flow already works correctly. We replicate this pattern for subscriptions:

**Event Flow (Working):**
- `eventRedirectUtils.ts` stores event context in localStorage
- `Step0.tsx` reads and displays event context card during signup
- After signup → redirects to `/thank-you-event/:id`

**Subscription Flow (To Build):**
- Create `subscriptionRedirectUtils.ts` to store subscription intent
- Modify `Step0.tsx` to read and display subscription context card
- After signup → redirect to `/subscribe` (payment page)

---

## Implementation Plan

### Phase 1: Subscription Intent Storage (Similar to eventRedirectUtils.ts)

#### Task 1.1: Create subscriptionRedirectUtils.ts

**File**: `src/shared/utils/subscriptionRedirectUtils.ts` (NEW)

```typescript
/**
 * Subscription Redirect Utilities
 * Manages subscription intent during signup flow for non-authenticated users
 */

import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './localStorage';

export interface PendingSubscriptionContext {
  returnUrl: string;
  timestamp: number;
}

const PENDING_SUBSCRIPTION_KEY = 'pendingSubscription';
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Store subscription intent when redirecting to signup
 */
export const storePendingSubscriptionContext = (): boolean => {
  const context: PendingSubscriptionContext = {
    returnUrl: '/subscribe',
    timestamp: Date.now(),
  };
  const result = setLocalStorageItem(PENDING_SUBSCRIPTION_KEY, context);
  return result.success;
};

/**
 * Retrieve pending subscription context during signup
 */
export const getPendingSubscriptionContext = (): PendingSubscriptionContext | null => {
  const result = getLocalStorageItem<PendingSubscriptionContext>(PENDING_SUBSCRIPTION_KEY);

  if (!result.success || !result.data) {
    return null;
  }

  const context = result.data;

  // Check if context has expired
  if (Date.now() - context.timestamp > CONTEXT_EXPIRY_MS) {
    clearPendingSubscriptionContext();
    return null;
  }

  return context;
};

/**
 * Clear pending subscription context
 */
export const clearPendingSubscriptionContext = (): boolean => {
  const result = removeLocalStorageItem(PENDING_SUBSCRIPTION_KEY);
  return result.success;
};

/**
 * Check if there's a valid pending subscription context
 */
export const hasPendingSubscriptionContext = (): boolean => {
  return getPendingSubscriptionContext() !== null;
};

/**
 * Generate subscription signup URL
 */
export const generateSubscriptionSignupUrl = (): string => {
  return '/signup?source=subscription';
};
```

---

### Phase 2: Refactor Subscribe Page for Public + Authenticated Views

#### Task 2.1: Update Subscribe.tsx structure

**File**: `src/pages/Subscribe.tsx`

**Current Problem**: Page is wrapped in `ProtectedRoute`, redirects to signin

**Solution**:
1. Remove `ProtectedRoute` wrapper from App.tsx route
2. Handle authentication state inside Subscribe.tsx
3. Show public landing page for non-authenticated users
4. Show payment flow for authenticated users

**New Structure**:

```tsx
// src/pages/Subscribe.tsx
export default function SubscribePage() {
  const { user, loading } = useAuth();
  const { data: subscription } = useCurrentSubscription();
  const hasActiveSubscription = subscription?.status === 'active';

  // Loading state
  if (loading) return <LoadingSpinner />;

  // Non-authenticated: Show public landing page
  if (!user) {
    return <SubscribeLandingPage />;
  }

  // Already subscribed: Show status (existing code)
  if (hasActiveSubscription && subscription) {
    return <AlreadySubscribedView subscription={subscription} />;
  }

  // Authenticated, not subscribed: Show payment flow (existing code)
  return <SubscribePaymentView />;
}
```

---

#### Task 2.2: Create SubscribeLandingPage component

**File**: `src/pages/Subscribe.tsx` (or `src/pages/SubscribeLanding.tsx` if preferred)

**Section 1: Hero Section**

```tsx
function HeroSection({ subscriptionInfo, onSubscribe }) {
  return (
    <section className="bg-gradient-to-br from-amber-50 via-white to-amber-50/30 px-4 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 lg:text-5xl">
              Become a TrafficMENA Premium Member
            </h1>
            <p className="text-xl text-muted-foreground">
              Unlock exclusive access to digital marketing education designed for the MENA region
            </p>
            <ul className="space-y-3">
              {SUBSCRIPTION_BENEFITS.slice(0, 4).map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Pricing Card */}
          <div className="lg:pl-8">
            <Card className="rounded-[28px] border-2 border-amber-200 bg-white shadow-xl">
              <CardHeader className="text-center pb-4">
                <Badge className="mx-auto mb-4 bg-amber-100 text-amber-800">
                  Annual Subscription
                </Badge>
                <CardTitle className="text-5xl font-bold text-primary">
                  {subscriptionInfo?.priceEgp || '---'} EGP
                </CardTitle>
                <CardDescription className="text-lg">per year</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Free access to all online events
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {subscriptionInfo?.discountPercent || 20}% off all paid content
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Premium learning tracks
                  </li>
                </ul>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={onSubscribe}
                >
                  <Crown className="mr-2 h-5 w-5" />
                  Subscribe Now
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  365 days of premium access
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Section 2: Testimonials Section**

```tsx
// Testimonial card data structure
const TESTIMONIALS = [
  {
    type: 'video', // or 'screenshot'
    videoUrl: 'https://youtube.com/shorts/...', // YouTube Shorts embed
    thumbnail: '/images/testimonial-1.jpg',
    name: 'Ahmed M.',
    role: 'Digital Marketing Manager',
  },
  {
    type: 'screenshot',
    image: '/images/screenshot-1.jpg',
    quote: 'The best investment in my career...',
    name: 'Sara K.',
    role: 'E-commerce Specialist',
  },
  // ... more testimonials
];

function TestimonialsSection() {
  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-center text-3xl font-bold">
          What Our Members Say
        </h2>
        {/* Desktop: 4 cards, Mobile: 3 cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.slice(0, 4).map((testimonial, index) => (
            <TestimonialCard
              key={index}
              testimonial={testimonial}
              // Hide 4th card on small screens
              className={index === 3 ? 'hidden lg:block' : ''}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, className }) {
  if (testimonial.type === 'video') {
    return (
      <Card className={cn("overflow-hidden rounded-xl", className)}>
        {/* Vertical video embed or thumbnail with play button */}
        <div className="aspect-[9/16] bg-neutral-100">
          {/* YouTube Shorts embed or image */}
        </div>
        <CardContent className="p-4">
          <p className="font-medium">{testimonial.name}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </CardContent>
      </Card>
    );
  }

  // Screenshot type
  return (
    <Card className={cn("overflow-hidden rounded-xl", className)}>
      <div className="aspect-square bg-neutral-100">
        <img src={testimonial.image} alt="" className="h-full w-full object-cover" />
      </div>
      <CardContent className="p-4">
        <p className="text-sm italic">"{testimonial.quote}"</p>
        <p className="mt-2 font-medium">{testimonial.name}</p>
        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
      </CardContent>
    </Card>
  );
}
```

**Section 3: Premium Content Section**

```tsx
const PREMIUM_TRACKS = [
  {
    title: 'Performance Marketing Track',
    description: 'Master paid advertising across Meta, Google, and TikTok',
    image: '/images/tracks/performance-marketing.jpg',
    benefits: [
      'Facebook & Instagram Ads mastery',
      'Google Ads certification prep',
      'Campaign optimization techniques',
      'ROI tracking and analytics',
    ],
  },
  {
    title: 'Content Marketing Track',
    description: 'Create compelling content that converts',
    image: '/images/tracks/content-marketing.jpg',
    benefits: [
      'Content strategy development',
      'SEO-optimized writing',
      'Video content creation',
      'Social media management',
    ],
  },
  // Expandable: Add more tracks/events here
];

function PremiumContentSection() {
  return (
    <section className="bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold">
          What's Included in Premium
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          Access exclusive learning tracks and courses
        </p>

        <div className="space-y-12">
          {PREMIUM_TRACKS.map((track, index) => (
            <div
              key={track.title}
              className={cn(
                "grid gap-8 lg:grid-cols-2 items-center",
                index % 2 === 1 && "lg:flex-row-reverse"
              )}
            >
              {/* Text side */}
              <div className={cn("space-y-4", index % 2 === 1 && "lg:order-2")}>
                <h3 className="text-2xl font-bold">{track.title}</h3>
                <p className="text-muted-foreground">{track.description}</p>
                <ul className="space-y-2">
                  {track.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image side */}
              <div className={cn(index % 2 === 1 && "lg:order-1")}>
                <div className="aspect-video overflow-hidden rounded-xl bg-neutral-100">
                  <img
                    src={track.image}
                    alt={track.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Section 4: CTA Reminder Section**

```tsx
function CTAReminderSection({ subscriptionInfo, onSubscribe }) {
  return (
    <section className="bg-gradient-to-br from-primary/5 to-amber-50 px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Crown className="mx-auto mb-6 h-12 w-12 text-amber-500" />
        <h2 className="mb-4 text-3xl font-bold">
          Ready to Level Up Your Marketing Career?
        </h2>
        <p className="mb-6 text-lg text-muted-foreground">
          Join hundreds of marketers in the MENA region who are already learning
          from industry experts and growing their skills.
        </p>

        <div className="mb-8 inline-flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Check className="h-4 w-4 text-primary" />
            Free online events
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Check className="h-4 w-4 text-primary" />
            {subscriptionInfo?.discountPercent || 20}% off all content
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Check className="h-4 w-4 text-primary" />
            Priority support
          </div>
        </div>

        <Button size="lg" onClick={onSubscribe}>
          <Crown className="mr-2 h-5 w-5" />
          Subscribe Now - {subscriptionInfo?.priceEgp || '---'} EGP/year
        </Button>
      </div>
    </section>
  );
}
```

**Main Landing Page Component**

```tsx
function SubscribeLandingPage() {
  const navigate = useNavigate();
  const { data: subscriptionInfo } = useSubscriptionInfo();

  const handleSubscribeClick = () => {
    storePendingSubscriptionContext();
    navigate('/signup?source=subscription');
  };

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection
        subscriptionInfo={subscriptionInfo}
        onSubscribe={handleSubscribeClick}
      />
      <TestimonialsSection />
      <PremiumContentSection />
      <CTAReminderSection
        subscriptionInfo={subscriptionInfo}
        onSubscribe={handleSubscribeClick}
      />
      <Footer />
    </div>
  );
}
```

---

### Phase 3: Update Route Configuration

#### Task 3.1: Remove ProtectedRoute wrapper from /subscribe

**File**: `src/App.tsx`

**Change**: Lines 280-288

```diff
<Route
  path="/subscribe"
  element={
-   <ProtectedRoute>
      <ErrorBoundary>
        <SubscribePage />
      </ErrorBoundary>
-   </ProtectedRoute>
  }
/>
```

**Why**: Subscribe page now handles auth state internally to show public landing vs payment flow.

---

### Phase 4: Update Signup Flow to Handle Subscription Context

#### Task 4.1: Update Step0.tsx to detect subscription context

**File**: `src/pages/signup/Step0.tsx`

**Add**: Import subscription utils and display context card

```tsx
import { getPendingSubscriptionContext } from '@/shared/utils/subscriptionRedirectUtils';
import { Crown } from 'lucide-react';

// Inside Step0 component
const [subscriptionContext] = useState(getPendingSubscriptionContext());

// In the JSX, add subscription context card (similar to event context card)
{subscriptionContext && (
  <Card className="mb-6 rounded-2xl border-amber-200 bg-amber-50/80">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-600" />
        <CardTitle className="text-base">Subscribing to TrafficMENA Premium</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="text-sm text-muted-foreground">
        Complete signup to continue with your subscription and unlock premium benefits.
      </p>
    </CardContent>
  </Card>
)}
```

---

#### Task 4.2: Create postSignupRedirect utility (separation of concerns)

**File**: `src/shared/utils/postSignupRedirect.ts` (NEW)

**Purpose**: Centralize all post-signup redirect logic to keep CheckEmail.tsx clean

```tsx
import {
  getPendingSubscriptionContext,
  clearPendingSubscriptionContext,
} from './subscriptionRedirectUtils';
import {
  getPendingEventContext,
  clearPendingEventContext,
} from './eventRedirectUtils';

/**
 * Determines where to redirect after successful signup
 * Priority: subscription > event > dashboard
 */
export const getPostSignupRedirectUrl = (): string => {
  // Check subscription context first (highest priority)
  const subscriptionContext = getPendingSubscriptionContext();
  if (subscriptionContext) {
    clearPendingSubscriptionContext();
    return subscriptionContext.returnUrl;
  }

  // Check event context next
  const eventContext = getPendingEventContext();
  if (eventContext) {
    clearPendingEventContext();
    return `/thank-you-event/${eventContext.eventId}`;
  }

  // Default to dashboard
  return '/dashboard';
};
```

---

#### Task 4.3: Update CheckEmail.tsx to use postSignupRedirect

**File**: `src/pages/signup/CheckEmail.tsx`

**Change**: Replace hardcoded `/dashboard` redirect with utility call

```tsx
import { getPostSignupRedirectUrl } from '@/shared/utils/postSignupRedirect';

// After successful OTP verification
const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
  // ... existing validation ...
  try {
    await verifyOtp({ email, otp: code.trim() });
    await persistSignupProfile();
    toast({
      title: 'Welcome to TrafficMENA',
      description: 'You are now signed in.',
    });

    // Use centralized redirect logic
    const redirectUrl = getPostSignupRedirectUrl();
    navigate(redirectUrl);
  } catch (error) {
    // ... existing error handling ...
  }
};
```

---

### Phase 5: Verify Header Navigation

#### Task 5.1: Ensure Subscribe button links correctly

**File**: `src/shared/components/layout/Header.tsx`

**Verify**: The button links to `/subscribe` (which now shows public landing for non-auth users)

```tsx
// Desktop (around lines 108-119)
{!hasActiveSubscription && (
  <Link to="/subscribe">
    <Button variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">
      <Crown className="h-4 w-4" />
      <span>Subscribe</span>
    </Button>
  </Link>
)}
```

**Note**: For non-authenticated users, `hasActiveSubscription` is undefined/falsy, so button shows correctly.

---

## Files to Modify

| Task | File | Changes |
|------|------|---------|
| 1.1 | `src/shared/utils/subscriptionRedirectUtils.ts` | **NEW** - Create subscription intent storage utilities |
| 2.1-2.2 | `src/pages/Subscribe.tsx` | Refactor to handle both public landing and authenticated payment views |
| 3.1 | `src/App.tsx` | Remove ProtectedRoute wrapper from /subscribe route |
| 4.1 | `src/pages/signup/Step0.tsx` | Add subscription context detection and card display |
| 4.2 | `src/shared/utils/postSignupRedirect.ts` | **NEW** - Centralized post-signup redirect logic |
| 4.3 | `src/pages/signup/CheckEmail.tsx` | Use postSignupRedirect utility instead of hardcoded redirect |
| 5.1 | `src/shared/components/layout/Header.tsx` | Verify subscribe button visible to all users |

---

## Mock File Names for Components

```
src/
├── pages/
│   └── Subscribe.tsx               # Main page (refactored)
│       ├── SubscribeLandingPage    # Public landing (new component)
│       ├── HeroSection             # Section 1
│       ├── TestimonialsSection     # Section 2
│       ├── PremiumContentSection   # Section 3
│       ├── CTAReminderSection      # Section 4
│       ├── AlreadySubscribedView   # Existing (extract)
│       └── SubscribePaymentView    # Existing (extract)
├── shared/
│   └── utils/
│       └── subscriptionRedirectUtils.ts  # NEW
```

---

## ERD - No Schema Changes Required

The existing schema already supports this feature:
- `subscriptions` table exists
- `payments` table exists
- Fawaterk integration exists in `server/src/services/fawaterk.ts`

---

## Testing Checklist

### Non-Authenticated User Flow
- [ ] Subscribe button visible in navbar when not logged in
- [ ] Clicking Subscribe shows public landing page (not signin redirect)
- [ ] Hero section displays with headline, benefits, and pricing card
- [ ] Testimonials section shows 4 cards on desktop, 3 on mobile
- [ ] Premium content section shows Performance Marketing and Content Marketing tracks
- [ ] CTA reminder section displays at bottom
- [ ] Price displays correctly from subscriptionInfo API
- [ ] Clicking "Subscribe Now" stores subscription intent in localStorage
- [ ] User redirected to `/signup?source=subscription`
- [ ] Subscription context card shows during signup flow
- [ ] After signup completion, user redirected to `/subscribe` (payment flow)
- [ ] Payment method selector works
- [ ] After payment, redirected to `/payment/success`

### Authenticated User Flow (Not Subscribed)
- [ ] Subscribe button visible in navbar
- [ ] Clicking Subscribe goes to payment flow (skips landing page)
- [ ] Payment flow works correctly

### Already Subscribed User Flow
- [ ] Subscribe button hidden in navbar
- [ ] Direct URL `/subscribe` shows "You're a Subscriber!" card

### Mobile Responsiveness
- [ ] Hero section stacks vertically (text above, pricing card below)
- [ ] Testimonials show 3 cards (4th hidden)
- [ ] Premium content sections stack properly
- [ ] CTA section is mobile-optimized
- [ ] All buttons are full-width on mobile

### Edge Cases
- [ ] Subscription intent expires after 30 minutes
- [ ] User abandons signup - intent preserved for retry
- [ ] Payment failure - shows error, allows retry

---

## Acceptance Criteria

- [ ] Non-authenticated users see public landing page when clicking Subscribe
- [ ] Landing page shows all 4 sections: Hero, Testimonials, Premium Content, CTA
- [ ] Hero section has text on left, pricing card on right (desktop)
- [ ] Testimonials show 4 cards on desktop, 3 on mobile
- [ ] Premium Content shows Performance Marketing and Content Marketing tracks
- [ ] Subscription intent preserved through signup flow
- [ ] Context card displayed during signup (similar to event flow)
- [ ] After signup, user automatically redirected to payment flow
- [ ] After payment, user redirected to success page
- [ ] Authenticated users without subscription skip to payment flow
- [ ] Already subscribed users see current "You're a Subscriber" view

---

## Implementation Order

1. **Task 1.1**: Create `subscriptionRedirectUtils.ts` (foundation)
2. **Task 4.2**: Create `postSignupRedirect.ts` (centralized redirect logic)
3. **Task 3.1**: Update `App.tsx` route (unblock testing)
4. **Task 2.1-2.2**: Refactor `Subscribe.tsx` with all sections (main feature)
5. **Task 4.1**: Update `Step0.tsx` (signup context display)
6. **Task 4.3**: Update `CheckEmail.tsx` (use postSignupRedirect utility)
7. **Task 5.1**: Verify `Header.tsx` (button visibility)

---

## Notes

- **No Arabic/RTL**: Per user request, RTL support is a separate project for the entire platform
- **MVP Mindset**: Reusing existing patterns (event flow) rather than building new infrastructure
- **Existing Components**: Using existing `SUBSCRIPTION_BENEFITS`, `useSubscriptionInfo`, payment components
- **Testimonials Data**: Placeholder data structure provided - actual testimonials/videos to be added
- **Track Images**: Placeholder paths - actual images to be added
- **Expandable**: Premium content section designed to easily add more tracks/events later

---

## Review Findings Addressed

### P2 Findings (Applied)

1. **Unified Post-Signup Redirect Handler**: Create `src/shared/utils/postSignupRedirect.ts` to centralize redirect logic instead of adding it directly to CheckEmail.tsx. This maintains separation of concerns.

2. **Subscription Context Card Styling**: Use amber color palette consistently (`text-amber-900`, `text-amber-700`, `text-amber-600`) to match event card pattern.

3. **Use Layout Wrapper**: Use `<Layout>` component instead of manual Header/Footer for consistency with Index.tsx.

### P3 Findings (Deferred)

4. **Agent-Native API Storage**: Deferred to post-MVP - localStorage approach is consistent with existing event pattern.

5. **TOCTOU Price Validation**: Deferred - server-side price calculation already prevents overcharging; user confusion is acceptable for MVP.
