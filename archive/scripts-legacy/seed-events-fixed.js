#!/usr/bin/env node

/**
 * Fixed Event Seeding Script for TrafficMENA Hub
 * This script creates realistic sample events using the correct database schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables');
  console.error('Please ensure the following environment variables are set:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('\nCreate a .env file in the project root with these values.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Schema-compliant events data for MENA region
const eventsData = [
  {
    title: 'Social Media Marketing Mastery for MENA Brands',
    description:
      'Join us for an intensive workshop on creating compelling social media strategies specifically tailored for the Middle East and North Africa market.',
    event_description:
      'Learn how to leverage cultural insights, local trends, and platform-specific best practices to build engaging campaigns that resonate with MENA audiences. This workshop covers advanced targeting techniques, crisis management, and ROI optimization for regional markets.',
    date: '2025-08-15T18:00:00.000Z',
    location: 'Dubai Internet City, UAE',
    max_attendees: 50,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
    tags: ['social-media', 'workshop', 'mena', 'instagram', 'content-marketing'],
    guest_experts: {
      main_host: {
        name: 'Sarah Al-Mahmoud',
        bio: 'Senior Digital Marketing Manager at Careem with 8+ years of experience in MENA social media marketing.',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b4e53b2e?w=400&h=400&fit=crop',
      },
      agenda: [
        '18:00-18:30: Registration and Welcome',
        '18:30-19:15: MENA Social Media Landscape Overview',
        '19:15-20:00: Hands-on Campaign Creation Workshop',
        '20:00-20:30: Q&A and Networking',
      ],
      learning_outcomes: [
        'Advanced audience targeting techniques for MENA markets',
        'Platform-specific content strategies for Instagram, TikTok, and Snapchat',
        'Cultural sensitivity in social media marketing',
        'ROI measurement and optimization tactics',
      ],
    },
  },
  {
    title: 'E-commerce Growth Hacks: From Startup to Scale in MENA',
    description: 'Discover proven strategies to grow your e-commerce business in the MENA region.',
    event_description:
      'This masterclass covers everything from market entry strategies to scaling operations across multiple countries. Learn from successful entrepreneurs who have built million-dollar e-commerce businesses in the region.',
    date: '2025-08-18T19:00:00.000Z',
    location: 'Riyadh Digital Hub, Saudi Arabia',
    max_attendees: 75,
    event_type: 'Mastermind',
    image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
    tags: ['e-commerce', 'growth', 'startup', 'scaling', 'marketplace'],
    guest_experts: {
      main_host: {
        name: 'Ahmed Khalil',
        bio: 'Founder and CEO of successful e-commerce ventures. Ahmed built and scaled three startups in MENA with combined revenues exceeding $50M.',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      },
      agenda: [
        '19:00-19:15: Welcome and Introductions',
        '19:15-19:45: MENA E-commerce Market Analysis',
        '19:45-20:30: Growth Strategy Deep Dive',
        '20:30-21:00: Interactive Q&A and Networking',
      ],
      learning_outcomes: [
        'Market entry strategies for different MENA countries',
        'Payment gateway optimization for regional preferences',
        'Customer acquisition cost optimization',
        'Building trust and credibility in online retail',
      ],
    },
  },
  {
    title: 'Data-Driven Marketing: Advanced Analytics for MENA Markets',
    description:
      'Master the art and science of marketing analytics with a focus on MENA market dynamics.',
    event_description:
      'This technical seminar covers advanced data analysis techniques, customer behavior insights, and predictive modeling for marketing optimization. Perfect for marketers who want to make data-driven decisions.',
    date: '2025-08-22T17:30:00.000Z',
    location: 'Cairo Tech Park, Egypt',
    max_attendees: 40,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    tags: ['analytics', 'data-science', 'google-analytics', 'modeling', 'technical'],
    guest_experts: {
      main_host: {
        name: 'Dr. Fatima Hassan',
        bio: 'Lead Data Scientist at Vodafone Egypt and former Google Analytics consultant. Dr. Hassan holds a PhD in Statistics.',
        image: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop',
      },
      agenda: [
        '17:30-17:45: Registration and Setup',
        '17:45-18:30: Analytics Fundamentals Review',
        '18:30-19:15: Advanced Techniques Deep Dive',
        '19:15-20:00: Live Data Analysis Demo',
      ],
      learning_outcomes: [
        'Advanced Google Analytics 4 setup and analysis',
        'Customer lifetime value modeling',
        'Attribution modeling for multi-channel campaigns',
        'A/B testing statistical significance',
      ],
    },
  },
  {
    title: 'Influencer Marketing Excellence: Building Authentic Partnerships',
    description:
      'Navigate the unique landscape of influencer marketing in the Middle East and North Africa.',
    event_description:
      'Learn how to identify, approach, and collaborate with the right influencers for your brand. This workshop covers contract negotiations, content guidelines, and performance measurement specific to MENA markets.',
    date: '2025-08-25T18:30:00.000Z',
    location: 'Amman Design Week Hub, Jordan',
    max_attendees: 35,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
    tags: ['influencer-marketing', 'partnerships', 'content-creation', 'contracts', 'roi'],
    guest_experts: {
      main_host: {
        name: 'Layla Qureshi',
        bio: 'Founder of MENA Influence Agency, representing over 200 top-tier influencers across the region.',
        image: 'https://images.unsplash.com/photo-1590086782792-42dd2350140d?w=400&h=400&fit=crop',
      },
      agenda: [
        '18:30-18:45: Welcome and Industry Overview',
        '18:45-19:30: Influencer Selection Workshop',
        '19:30-20:00: Contract and Legal Guidelines',
        '20:00-20:30: Campaign Planning Exercise',
      ],
      learning_outcomes: [
        'MENA influencer landscape and cultural considerations',
        'Influencer discovery and vetting processes',
        'Contract negotiation and legal considerations',
        'ROI measurement and campaign optimization',
      ],
    },
  },
  {
    title: 'Content Marketing That Converts: Storytelling for MENA Audiences',
    description: 'Create compelling content that resonates with diverse MENA audiences.',
    event_description:
      'This workshop focuses on culturally-aware storytelling, content localization, and omnichannel content strategies. Learn to create content that not only engages but drives measurable business results.',
    date: '2025-08-28T19:00:00.000Z',
    location: 'Beirut Digital District, Lebanon',
    max_attendees: 60,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    tags: ['content-marketing', 'storytelling', 'localization', 'video', 'strategy'],
    guest_experts: {
      main_host: {
        name: 'Omar Mansouri',
        bio: 'Content Strategy Director at Majid Al Futtaim and award-winning copywriter specializing in Arabic content marketing.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      },
      agenda: [
        '19:00-19:15: Welcome and Content Landscape',
        '19:15-19:45: Cultural Storytelling Workshop',
        '19:45-20:30: Content Creation Lab',
        '20:30-21:00: Distribution Strategy Planning',
      ],
      learning_outcomes: [
        'Cultural storytelling techniques for MENA markets',
        'Content localization vs. translation strategies',
        'Video content optimization for regional platforms',
        'Performance measurement and content ROI',
      ],
    },
  },
  {
    title: 'SEO Mastery for Arabic Content: Technical and Strategic Approaches',
    description:
      'Optimize your digital presence for Arabic search queries and regional search behavior.',
    event_description:
      'This technical workshop covers Arabic SEO best practices, local search optimization, and Google My Business strategies for MENA markets. Includes hands-on technical SEO audit training.',
    date: '2025-09-01T17:00:00.000Z',
    location: 'Kuwait Innovation Hub, Kuwait',
    max_attendees: 45,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800&h=600&fit=crop',
    tags: ['seo', 'arabic', 'technical', 'local-search', 'google'],
    guest_experts: {
      main_host: {
        name: 'Mariam Al-Zahra',
        bio: 'Senior SEO Consultant and former Google Partner. Mariam has optimized websites generating over $10M in organic traffic value.',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b4e53b2e?w=400&h=400&fit=crop',
      },
      agenda: [
        '17:00-17:15: Registration and Tool Setup',
        '17:15-18:00: Arabic SEO Fundamentals',
        '18:00-18:45: Technical SEO Workshop',
        '18:45-19:30: Local SEO Lab Session',
      ],
      learning_outcomes: [
        'Arabic keyword research and search intent analysis',
        'Technical SEO for RTL languages and Arabic content',
        'Local SEO optimization for MENA markets',
        'SEO audit techniques and tools',
      ],
    },
  },
  {
    title: 'Marketing Automation Excellence: Customer Journey Optimization',
    description: 'Design and implement sophisticated marketing automation workflows.',
    event_description:
      'Learn to use tools like HubSpot, Marketo, and regional alternatives to create automated campaigns that increase conversion rates and customer lifetime value through personalized customer journeys.',
    date: '2025-09-05T18:00:00.000Z',
    location: 'Abu Dhabi Global Market, UAE',
    max_attendees: 55,
    event_type: 'Mastermind',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    tags: ['automation', 'email-marketing', 'crm', 'lead-generation', 'workflows'],
    guest_experts: {
      main_host: {
        name: 'Khalid Al-Rashid',
        bio: 'Marketing Technology Director at Emirates Group and certified automation expert with $25M+ in attributed revenue.',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      },
      agenda: [
        '18:00-18:15: Welcome and Platform Overview',
        '18:15-19:00: Journey Mapping Workshop',
        '19:00-19:45: Automation Setup Lab',
        '19:45-20:15: Integration and Testing',
      ],
      learning_outcomes: [
        'Customer journey mapping and persona development',
        'Email automation workflow design',
        'Lead scoring and qualification systems',
        'CRM integration and data management',
      ],
    },
  },
  {
    title: 'Performance Marketing Bootcamp: Paid Advertising ROI Optimization',
    description:
      'Master the fundamentals of performance marketing across Google Ads, Meta Ads, and regional platforms.',
    event_description:
      'This intensive bootcamp covers campaign setup, audience targeting, creative optimization, and advanced bidding strategies to maximize your advertising ROI across all major platforms.',
    date: '2025-09-08T16:00:00.000Z',
    location: 'Doha Science & Technology Park, Qatar',
    max_attendees: 40,
    event_type: 'Retreat',
    image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
    tags: ['paid-advertising', 'google-ads', 'facebook-ads', 'roi', 'performance'],
    guest_experts: {
      main_host: {
        name: 'Nadia Khoury',
        bio: 'Performance Marketing Manager at Wego and Google Ads certified professional managing over $2M in annual ad spend.',
        image: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop',
      },
      agenda: [
        '16:00-16:30: Registration and Account Setup',
        '16:30-17:30: Campaign Structure Workshop',
        '17:30-18:30: Targeting and Creative Lab',
        '18:30-19:15: Bidding Strategy Deep Dive',
      ],
      learning_outcomes: [
        'Campaign structure and account setup best practices',
        'Advanced audience targeting and lookalike creation',
        'Creative testing and optimization strategies',
        'Attribution modeling and cross-platform measurement',
      ],
    },
  },
  {
    title: 'Brand Strategy Workshop: Building Strong Brands in Competitive MENA Markets',
    description:
      'Develop a comprehensive brand strategy that differentiates your business in crowded MENA markets.',
    event_description:
      'This strategic workshop covers brand positioning, competitive analysis, visual identity development, and brand messaging that resonates with regional audiences while maintaining global appeal.',
    date: '2025-09-12T18:30:00.000Z',
    location: 'Muscat Innovation Hub, Oman',
    max_attendees: 30,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1552664688-cf412ec27db2?w=800&h=600&fit=crop',
    tags: ['branding', 'strategy', 'positioning', 'identity', 'messaging'],
    guest_experts: {
      main_host: {
        name: 'Yasmin Al-Habib',
        bio: 'Brand Strategy Consultant and former Creative Director at Ogilvy MENA with 50+ successful brand strategies.',
        image: 'https://images.unsplash.com/photo-1590086782792-42dd2350140d?w=400&h=400&fit=crop',
      },
      agenda: [
        '18:30-18:45: Welcome and Brand Audit',
        '18:45-19:30: Positioning Workshop',
        '19:30-20:15: Brand Identity Lab',
        '20:15-21:00: Brand Presentation and Feedback',
      ],
      learning_outcomes: [
        'Competitive brand analysis and positioning frameworks',
        'Brand personality and voice development',
        'Visual identity and brand guidelines creation',
        'Brand messaging and communication strategies',
      ],
    },
  },
  {
    title: 'Digital Transformation for Traditional Businesses in MENA',
    description: 'Guide traditional businesses through successful digital transformation journeys.',
    event_description:
      'This seminar covers change management, technology adoption strategies, team training, and measuring digital transformation success. Perfect for consultants and business leaders managing organizational change.',
    date: '2025-09-15T17:30:00.000Z',
    location: 'Casablanca Finance City, Morocco',
    max_attendees: 50,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    tags: ['digital-transformation', 'change-management', 'technology', 'consulting', 'roi'],
    guest_experts: {
      main_host: {
        name: 'Hassan Benjelloun',
        bio: 'Digital Transformation Consultant and former McKinsey partner with $100M+ in successful transformation projects.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      },
      agenda: [
        '17:30-17:45: Registration and Assessment',
        '17:45-18:30: Transformation Framework Overview',
        '18:30-19:15: Case Study Analysis',
        '19:15-20:00: Implementation Planning Workshop',
      ],
      learning_outcomes: [
        'Digital maturity assessment frameworks',
        'Change management and team adoption strategies',
        'Technology stack selection and integration',
        'ROI measurement and success metrics',
      ],
    },
  },
  {
    title: 'Marketing Leadership Excellence: Building High-Performance Teams',
    description:
      'Develop the leadership skills needed to build and manage high-performing marketing teams.',
    event_description:
      'This leadership-focused session covers team building, performance management, cross-cultural communication, and strategic planning in the dynamic MENA market environment.',
    date: '2025-09-18T19:00:00.000Z',
    location: 'Manama Business District, Bahrain',
    max_attendees: 25,
    event_type: 'Meetup',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    tags: ['leadership', 'team-building', 'management', 'strategy', 'development'],
    guest_experts: {
      main_host: {
        name: 'Leila Farah',
        bio: 'VP of Marketing at Talabat and executive coach. Leila has built and scaled marketing teams achieving 60% YoY growth.',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b4e53b2e?w=400&h=400&fit=crop',
      },
      agenda: [
        '19:00-19:15: Welcome and Leadership Assessment',
        '19:15-19:45: Team Building Strategies',
        '19:45-20:30: Performance Management Workshop',
        '20:30-21:00: Strategic Planning Session',
      ],
      learning_outcomes: [
        'Building diverse and inclusive marketing teams',
        'Performance management and goal setting',
        'Cross-cultural communication strategies',
        'Talent development and career progression',
      ],
    },
  },
  {
    title: 'Mobile-First Marketing: App Marketing and Mobile Optimization',
    description: 'Master mobile marketing in a region where mobile adoption leads the world.',
    event_description:
      'This workshop covers app store optimization, mobile advertising, push notification strategies, and mobile UX optimization specifically for MENA user behaviors and preferences.',
    date: '2025-09-22T18:00:00.000Z',
    location: 'Online Event - Zoom Webinar',
    max_attendees: 100,
    event_type: 'Event',
    meeting_link: 'https://zoom.us/j/trafficmena-mobile-marketing',
    image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop',
    tags: ['mobile-marketing', 'app-marketing', 'aso', 'mobile-ads', 'retention'],
    guest_experts: {
      main_host: {
        name: 'Tariq Al-Suwaidi',
        bio: 'Head of Mobile Marketing at Carrefour MENA and former app developer with 2M+ app downloads driven.',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      },
      agenda: [
        '18:00-18:15: Welcome and Mobile Landscape Overview',
        '18:15-18:45: ASO Workshop and Best Practices',
        '18:45-19:30: Mobile Advertising Deep Dive',
        '19:30-20:00: Retention Strategy Lab',
      ],
      learning_outcomes: [
        'App store optimization (ASO) best practices',
        'Mobile advertising campaign optimization',
        'Push notification and in-app messaging strategies',
        'App analytics and user behavior analysis',
      ],
    },
  },
  {
    title: 'Email Marketing Excellence: Advanced Automation and Personalization',
    description:
      'Master advanced email marketing techniques for maximum engagement and conversion.',
    event_description:
      'Learn sophisticated email marketing strategies including behavioral triggers, advanced segmentation, personalization techniques, and deliverability optimization for MENA markets.',
    date: '2025-09-25T19:30:00.000Z',
    location: 'Tunisia Tech Park, Tunisia',
    max_attendees: 65,
    event_type: 'Event',
    image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
    tags: ['email-marketing', 'automation', 'personalization', 'deliverability', 'segmentation'],
    guest_experts: {
      main_host: {
        name: 'Amira Zouari',
        bio: 'Email Marketing Director at Jumia with expertise in MENA email deliverability and automation strategies.',
        image: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop',
      },
      agenda: [
        '19:30-19:45: Welcome and Email Marketing Landscape',
        '19:45-20:15: Advanced Segmentation Workshop',
        '20:15-21:00: Automation Setup Lab',
        '21:00-21:30: Deliverability Optimization',
      ],
      learning_outcomes: [
        'Advanced audience segmentation techniques',
        'Behavioral trigger setup and optimization',
        'Email personalization beyond basic fields',
        'MENA-specific deliverability best practices',
      ],
    },
  },
  {
    title: 'Video Marketing Mastery: Creating Viral Content for MENA Audiences',
    description:
      'Create engaging video content that resonates across MENA markets and drives business results.',
    event_description:
      'This intensive workshop covers video production, storytelling, platform optimization, and viral marketing techniques specifically designed for Middle Eastern and North African audiences.',
    date: '2025-09-28T16:30:00.000Z',
    location: 'Al Khobar Innovation Hub, Saudi Arabia',
    max_attendees: 45,
    event_type: 'Retreat',
    image_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&h=600&fit=crop',
    tags: ['video-marketing', 'viral-content', 'storytelling', 'production', 'social-media'],
    guest_experts: {
      main_host: {
        name: 'Mahmoud El-Sherif',
        bio: 'Creative Director and viral video expert with over 50M views across MENA social media campaigns.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      },
      agenda: [
        '16:30-16:45: Welcome and Video Landscape Overview',
        '16:45-17:30: Storytelling Workshop',
        '17:30-18:30: Video Production Lab',
        '18:30-19:15: Platform Optimization Strategies',
      ],
      learning_outcomes: [
        'Culturally relevant video storytelling techniques',
        'Low-budget high-impact video production',
        'Platform-specific video optimization',
        'Viral content distribution strategies',
      ],
    },
  },
];

/**
 * Main seeding function with comprehensive error handling
 */
async function seedEvents() {
  console.log('🚀 Starting TrafficMENA Hub Event Seeding...');
  console.log(`📊 Preparing to seed ${eventsData.length} events`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process events in batches to avoid overwhelming the database
  const batchSize = 5;
  for (let i = 0; i < eventsData.length; i += batchSize) {
    const batch = eventsData.slice(i, i + batchSize);

    console.log(
      `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(eventsData.length / batchSize)}`,
    );

    for (const event of batch) {
      try {
        // Validate event data before insertion
        if (!event.title || !event.date) {
          throw new Error('Missing required fields: title and date');
        }

        // Insert event
        const { data, error } = await supabase
          .from('events')
          .insert([event])
          .select('id, title, event_type, date');

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          console.log(`✅ ${event.title} (${event.event_type})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Failed: ${event.title} - ${err.message}`);
        errors.push({ title: event.title, error: err.message });
        errorCount++;
      }
    }

    // Add small delay between batches
    if (i + batchSize < eventsData.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Final results and validation
  console.log('\n📈 SEEDING RESULTS:');
  console.log(`✅ Successfully seeded: ${successCount} events`);
  console.log(`❌ Failed to seed: ${errorCount} events`);

  if (errors.length > 0) {
    console.log('\n❌ Detailed Errors:');
    errors.forEach(({ title, error }) => {
      console.log(`   • ${title}: ${error}`);
    });
  }

  if (successCount > 0) {
    // Verify seeded data
    await validateSeededData();
  }

  return { successCount, errorCount, errors };
}

/**
 * Validate the seeded data
 */
async function validateSeededData() {
  console.log('\n🔍 Validating seeded data...');

  try {
    // Get upcoming events
    const { data: upcomingEvents, error: upcomingError } = await supabase
      .from('events')
      .select('id, title, date, event_type, location')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(10);

    if (upcomingError) {
      console.error('❌ Error fetching upcoming events:', upcomingError.message);
      return;
    }

    if (upcomingEvents && upcomingEvents.length > 0) {
      console.log(`📅 Upcoming Events (${upcomingEvents.length}):`);
      upcomingEvents.forEach((event, index) => {
        const eventDate = new Date(event.date).toLocaleDateString('en-GB');
        console.log(`   ${index + 1}. ${event.title}`);
        console.log(`      📍 ${event.location} | 📅 ${eventDate} | 🎯 ${event.event_type}`);
      });
    } else {
      console.log('⚠️ No upcoming events found');
    }

    // Get event statistics
    const { data: allEvents } = await supabase.from('events').select('event_type, date');

    if (allEvents) {
      const eventTypes = allEvents.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Event Statistics:');
      console.log(`   Total Events: ${allEvents.length}`);
      console.log('   By Type:');
      Object.entries(eventTypes).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }

    console.log('\n🎉 Event seeding completed successfully!');
    console.log('🌐 You can now test the event booking functionality on the platform.');
  } catch (error) {
    console.error('❌ Validation error:', error.message);
  }
}

/**
 * Clean existing events (for development/testing)
 */
async function cleanExistingEvents() {
  console.log('🧹 Cleaning existing events...');

  const { data, error } = await supabase.from('events').delete().gte('created_at', '2024-01-01');

  if (error) {
    console.error('❌ Error cleaning events:', error.message);
    return false;
  }

  console.log(`✅ Cleaned existing events`);
  return true;
}

// CLI argument handling
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');

// Main execution
async function main() {
  try {
    if (shouldClean) {
      await cleanExistingEvents();
    }

    const results = await seedEvents();

    if (results.successCount > 0) {
      console.log('\n🎯 Next Steps:');
      console.log('1. Check the events page: http://localhost:8080/meetups');
      console.log('2. Test event booking functionality');
      console.log('3. Check admin panel: http://localhost:8080/admin/meetups');
      console.log('4. Verify event filtering and search');
    }

    process.exit(results.errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal seeding error:', error);
    process.exit(1);
  }
}

main();
