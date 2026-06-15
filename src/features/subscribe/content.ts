import {
  Briefcase,
  Calendar,
  FileText,
  Globe,
  Mic,
  Rocket,
  TrendingUp,
  Users,
  Users2,
} from 'lucide-react';

// Hero section benefits (used in both hero and already-subscribed views)
export const HERO_BENEFITS = [
  'Content Marketing Track (6 sessions)',
  'Performance Marketing Track (7 sessions)',
  '2x monthly expert sessions',
  'All future online tracks included',
  '20%+ off all offline events',
  'Exclusive playbooks & templates',
];

// Content Marketing Track sessions
export const CONTENT_MARKETING_SESSIONS = [
  {
    number: 1,
    topic: 'Build Content System with Content Pillars & Messaging Framework',
  },
  {
    number: 2,
    topic: 'Content Marketing Funnel Design: Mapping content to customer journey',
  },
  { number: 3, topic: 'Podcast Content Marketing' },
  {
    number: 4,
    topic: 'Content Types & Formats and The Art of Content Distribution',
  },
  { number: 5, topic: 'Content Marketing for Personal Branding' },
  {
    number: 6,
    topic: 'Content Strategy Presentation: How to build your Portfolio',
  },
];

export const CONTENT_MARKETING_BONUS = [
  'Full-Stack Generative AI for Content Creation (Presentation)',
  'Reels Creation from the Kitchen (Recording + Presentation)',
  'Performance Creatives Analysis (Recording + Presentation)',
];

// Performance Marketing Track sessions
export const PERFORMANCE_MARKETING_SESSIONS = [
  { number: 1, topic: 'Performance Marketing Strategy' },
  { number: 2, topic: 'Performance Marketing Mindset' },
  { number: 3, topic: 'Performance Marketing: Meta Ads' },
  { number: 4, topic: 'Performance Marketing: TikTok & Snapchat Ads' },
  { number: 5, topic: 'Performance Marketing: Google Search Ads' },
  { number: 6, topic: 'Full B2B Performance Marketing' },
  { number: 7, topic: 'Meta Ads Scaling Strategies' },
];

export const PERFORMANCE_MARKETING_BONUS = [
  'Google Ads Deep Dive: PMax, Demand Gen, Standard Shopping (Recording + Presentation)',
  'Convert Your Skills to Agency: One Niche Agency Model (Recording + Presentation)',
];

// Premium benefits for timeline section
export const PREMIUM_BENEFITS = [
  {
    id: '01',
    title: '2x Monthly Sessions',
    description:
      'Two Q&A or topic-based sessions every month (vs one for free members). Topics chosen by premium member votes with direct access to experts.',
    value: '24 sessions per year × 50 EGP = 1,200 EGP/year',
    icon: Calendar,
  },
  {
    id: '02',
    title: 'Offline Event Discounts',
    description:
      '20%+ discount on all offline events and intensive days. Typical event savings: 200-450+ EGP per event.',
    value: 'Attend 2 events/year = 400-900 EGP saved',
    icon: Mic,
  },
  {
    id: '03',
    title: 'Exclusive Resources',
    description:
      'Ready-to-use templates, step-by-step playbooks, exclusive guides, and checklists that save hours of work.',
    value: 'New resources added throughout the year',
    icon: FileText,
  },
  {
    id: '04',
    title: 'Specialty Subgroups',
    description:
      'Access to focused communities: Performance Marketing, Content Marketing, E-commerce, and more as the community grows.',
    value: 'Connect with members who share your specialization',
    icon: Users,
  },
  {
    id: '05',
    title: 'All Future Tracks',
    description:
      'Every new online track we create is included. No additional payments as we expand our curriculum.',
    value: 'Early access before content becomes available to free members',
    icon: Rocket,
  },
];

// FREE vs PREMIUM comparison features
export const COMPARISON_FEATURES = [
  {
    name: 'E-commerce Business Track (7 sessions)',
    free: true,
    premium: true,
  },
  { name: 'AI for Marketers Track (5 sessions)', free: true, premium: true },
  { name: '23 Marketing Calculators', free: true, premium: true },
  {
    name: 'Monthly Q&A Sessions',
    free: '1/month',
    premium: '2/month',
    highlight: true,
  },
  { name: 'Community Access', free: true, premium: true },
  {
    name: 'Content Marketing Track (6 sessions + offline day)',
    free: false,
    premium: true,
    highlight: true,
  },
  {
    name: 'Performance Marketing Track (7 sessions + offline day)',
    free: false,
    premium: true,
    highlight: true,
  },
  {
    name: 'Exclusive Guides & Playbooks',
    free: false,
    premium: true,
    highlight: true,
  },
  {
    name: 'Templates & Checklists',
    free: false,
    premium: true,
    highlight: true,
  },
  { name: 'Specialty Subgroups', free: false, premium: true, highlight: true },
  {
    name: 'Offline Event Discounts (20%+)',
    free: false,
    premium: true,
    highlight: true,
  },
  {
    name: 'All Future Tracks Included',
    free: '6+ months later',
    premium: 'Immediately',
    highlight: true,
  },
];

// Value math breakdown
export const VALUE_MATH_ITEMS = [
  { label: 'Content Marketing Track + Offline Day Materials', value: 1000 },
  { label: 'Performance Marketing Track + Offline Day Materials', value: 2100 },
  { label: '24 Monthly Q&A Sessions (value at 1000 EGP avg each)', value: 24000 },
  { label: 'Offline Discount Savings (8 events × avg 350 EGP Discount)', value: 2800 },
  { label: 'Exclusive Resources (playbooks, templates, guides) avg', value: 5000 },
  {
    label: 'All Future Online Tracks & Offline Recordings (estimated 5-8 new tracks/year)',
    value: 17600,
  },
];

export const TOTAL_VALUE = VALUE_MATH_ITEMS.reduce((sum, item) => sum + item.value, 0);

// Centralized pricing constants
export const PRICING = {
  regular: 10000,
  foundingMember: 5000,
};

// ROI scenarios
export const ROI_SCENARIOS = [
  {
    icon: Briefcase,
    title: "You're Job Hunting",
    metric: '8-20x ROI',
    description:
      'Average salary increase for skilled digital marketer: 2,000-5,000 EGP/month. Premium helps you build portfolio and specialize.',
  },
  {
    icon: Users,
    title: "You're Freelancing",
    metric: 'Pays for itself',
    description:
      'One client closed using skills from Performance Marketing Track: 3,000-10,000 EGP/month. Premium pays for itself with one client.',
  },
  {
    icon: TrendingUp,
    title: 'You Want a Promotion',
    metric: 'Priceless',
    description:
      'Specialization is what gets noticed. The person who "knows Meta Ads deeply" gets promoted over the generalist.',
  },
];

// Differentiation points
export const DIFFERENTIATORS = [
  {
    icon: Users2,
    title: 'Multiple Experts, Not One Instructor',
    description:
      "Every track features different specialists. When you learn Performance Marketing, you hear from a strategist, a Meta ads expert, a Google ads specialist, and more. That's 7+ different perspectives, not one person's opinion.",
  },
  {
    icon: Briefcase,
    title: 'Practitioners, Not Professors',
    description:
      "Every expert who presents at TrafficMENA is actively working in marketing. They're not academics teaching theory. They're professionals sharing what's working NOW.",
  },
  {
    icon: Globe,
    title: 'Your Market, Not Generic Content',
    description:
      "Western marketing tactics don't always translate. Our experts have succeeded HERE. They understand the market, the audience psychology, and what actually converts in this region.",
  },
  {
    icon: Users,
    title: 'Community, Not Just Content',
    description:
      "You're not buying videos to watch alone. You're joining 1,200+ marketers who share wins, ask questions, and support each other. That network becomes your professional advantage.",
  },
];

// FAQ items
export const FAQ_ITEMS = [
  {
    question: "What's the difference between free and premium?",
    answer:
      "Free gives you our E-commerce and AI tracks, 23 calculators, and monthly Q&A. That's a complete learning foundation. Premium adds advanced tracks (Content Marketing, Performance Marketing), exclusive resources, 2x monthly sessions, offline discounts, and specialty subgroups. Think of it as: Free = Foundation, Premium = Specialization.",
  },
  {
    question: "What if I'm already a free member?",
    answer:
      'Upgrading is seamless. You keep everything you had, plus unlock all premium benefits instantly. Your learning progress carries over.',
  },
  {
    question: 'When does founding member pricing end?',
    answer:
      "We haven't set an exact date, but it won't last indefinitely. We'll give notice before pricing changes, but the best way to lock in this rate is to join now.",
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Yes, you can cancel anytime. Your access continues through the end of your subscription period.',
  },
  {
    question: 'Are offline events included?',
    answer:
      "Offline events have a separate ticket price, but premium members get 20%+ off all offline events. For events like TrafficMENA Next (our SEO/organic growth intensive), that's significant savings.",
  },
  {
    question: "What if I don't see value?",
    answer:
      "If you attend the sessions, use the resources, and engage with the community, you'll see value. But if for any reason you're not satisfied, reach out to us. We care more about your growth than your money.",
  },
  {
    question: 'How is this different from other courses?',
    answer:
      'Three ways: (1) Multiple experts per track, not one instructor. (2) Practitioners, not professors. Everyone teaching is actively working in marketing. (3) Content and community designed for marketers working in this region, not generic Western tactics.',
  },
];

// Founding member copy
export const FOUNDING_MEMBER_COPY = {
  badge: 'Founding Member',
  headline: 'Lock In 50% Off',
  description:
    "We're launching TrafficMENA Premium and offering founding members 50% off. This isn't a gimmick. It's our thank-you to early believers. Founding member pricing is available now but won't last forever. Your premium access, however, will.",
  features: [
    'Instant access to all premium content',
    'Founding member pricing locked for this year',
    "Cancel anytime (but you won't want to)",
  ],
};

// Video reviews from Bunny Stream
export const VIDEO_REVIEWS = [
  'https://iframe.mediadelivery.net/play/465597/e3fcc1e6-b848-4850-b418-18a4d556ae5e',
  'https://iframe.mediadelivery.net/play/465597/b9a6f7f9-3cf4-4375-80d8-189df32e857f',
  'https://iframe.mediadelivery.net/play/465597/c6f7a2f8-a193-4c80-93bf-adc581dc694d',
  'https://iframe.mediadelivery.net/play/465597/7f908cb7-4049-4d5c-ba0b-e8c296939937',
  'https://iframe.mediadelivery.net/play/465597/a47eeacf-2395-479e-9442-b713e3fd0784',
  'https://iframe.mediadelivery.net/play/465597/c4dfb79e-f21f-4985-875c-c1a553919b3a',
  'https://iframe.mediadelivery.net/play/465597/ee797560-72bb-4293-8eb1-e17425615bed',
  'https://iframe.mediadelivery.net/play/465597/c57caa71-4089-4689-862b-0786136c0fae',
  'https://iframe.mediadelivery.net/play/465597/1d1f3b59-4859-40d4-9e10-160091424a86',
  'https://iframe.mediadelivery.net/play/465597/d871c94b-0a93-4004-8bd5-64b36cfbbc7e',
  'https://iframe.mediadelivery.net/play/465597/dcdcdeed-4578-47dd-a63b-87262a2eb786',
];

// Final CTA copy
export const FINAL_CTA_COPY = {
  headline: 'Your Next Step',
  lead: "A year from now, you'll either be the generalist still hoping for a break, or the specialist who made it happen.",
  description:
    'Premium membership is your shortcut to specialization. Advanced tracks. Exclusive resources. A community that pushes you forward.',
  emphasis: "And right now, it's 50% off.",
  secondaryText: 'Not ready?',
  secondaryLink: 'Join Free',
  secondaryLinkHref: '/signup',
  secondaryLinkSuffix: 'and experience TrafficMENA first.',
};
