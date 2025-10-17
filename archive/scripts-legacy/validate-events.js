#!/usr/bin/env node

/**
 * Event Validation Utility for TrafficMENA Hub
 * This script validates the seeded events data and checks for potential issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables');
  console.error('Please ensure the following environment variables are set:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Comprehensive event validation
 */
async function validateEvents() {
  console.log('🔍 Starting TrafficMENA Hub Event Validation...\n');

  const validationResults = {
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    validEvents: 0,
    invalidEvents: 0,
    issues: [],
    warnings: [],
  };

  try {
    // Fetch all events
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    if (!events || events.length === 0) {
      console.log('⚠️ No events found in the database');
      return validationResults;
    }

    validationResults.totalEvents = events.length;
    console.log(`📊 Found ${events.length} events to validate\n`);

    const now = new Date();

    // Validate each event
    for (const event of events) {
      const issues = validateSingleEvent(event);
      const eventDate = new Date(event.date);

      if (eventDate > now) {
        validationResults.upcomingEvents++;
      } else {
        validationResults.pastEvents++;
      }

      if (issues.length === 0) {
        validationResults.validEvents++;
      } else {
        validationResults.invalidEvents++;
        validationResults.issues.push({
          eventId: event.id,
          title: event.title,
          issues: issues,
        });
      }
    }

    // Additional validations
    await validateEventTypes(events, validationResults);
    await validateEventTags(events, validationResults);
    await validateEventDates(events, validationResults);
    await validateEventImages(events, validationResults);

    // Display results
    displayValidationResults(validationResults);

    return validationResults;
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }
}

/**
 * Validate a single event
 */
function validateSingleEvent(event) {
  const issues = [];

  // Required fields validation
  if (!event.title || event.title.trim().length === 0) {
    issues.push('Missing or empty title');
  }

  if (!event.date) {
    issues.push('Missing date');
  } else {
    const eventDate = new Date(event.date);
    if (Number.isNaN(eventDate.getTime())) {
      issues.push('Invalid date format');
    }
  }

  // Event type validation
  const validEventTypes = ['Event', 'Meetup', 'Mastermind', 'Retreat'];
  if (!event.event_type || !validEventTypes.includes(event.event_type)) {
    issues.push(
      `Invalid event_type: ${event.event_type}. Must be one of: ${validEventTypes.join(', ')}`,
    );
  }

  // Optional field validation
  if (event.max_attendees && (event.max_attendees < 1 || event.max_attendees > 1000)) {
    issues.push('max_attendees should be between 1 and 1000');
  }

  if (event.image_url && !isValidUrl(event.image_url)) {
    issues.push('Invalid image_url format');
  }

  if (event.meeting_link && !isValidUrl(event.meeting_link)) {
    issues.push('Invalid meeting_link format');
  }

  // Tags validation
  if (event.tags && (!Array.isArray(event.tags) || event.tags.length === 0)) {
    issues.push('Tags should be a non-empty array');
  }

  // Guest experts validation (JSON structure)
  if (event.guest_experts) {
    try {
      const experts =
        typeof event.guest_experts === 'string'
          ? JSON.parse(event.guest_experts)
          : event.guest_experts;

      if (!experts.main_host || !experts.main_host.name) {
        issues.push('guest_experts should have a main_host with name');
      }
    } catch (e) {
      issues.push('Invalid guest_experts JSON structure');
    }
  }

  return issues;
}

/**
 * Validate event types distribution
 */
async function validateEventTypes(events, results) {
  const eventTypes = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Event Types Distribution:');
  Object.entries(eventTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} events`);
  });

  // Check for balanced distribution
  const totalEvents = events.length;
  Object.entries(eventTypes).forEach(([type, count]) => {
    const percentage = (count / totalEvents) * 100;
    if (percentage < 10 && totalEvents > 10) {
      results.warnings.push(
        `Low representation for ${type}: only ${percentage.toFixed(1)}% of events`,
      );
    }
  });
}

/**
 * Validate event tags
 */
async function validateEventTags(events, results) {
  const allTags = events
    .filter((event) => event.tags && Array.isArray(event.tags))
    .flatMap((event) => event.tags);

  const tagFrequency = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const popularTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('\n🏷️ Top 10 Event Tags:');
  popularTags.forEach(([tag, count]) => {
    console.log(`   ${tag}: ${count} events`);
  });

  // Check for events without tags
  const eventsWithoutTags = events.filter((event) => !event.tags || event.tags.length === 0);
  if (eventsWithoutTags.length > 0) {
    results.warnings.push(`${eventsWithoutTags.length} events missing tags`);
  }
}

/**
 * Validate event dates
 */
async function validateEventDates(events, results) {
  const now = new Date();
  const futureEvents = events.filter((event) => new Date(event.date) > now);
  const pastEvents = events.filter((event) => new Date(event.date) <= now);

  console.log('\n📅 Event Timeline:');
  console.log(`   Upcoming Events: ${futureEvents.length}`);
  console.log(`   Past Events: ${pastEvents.length}`);

  if (futureEvents.length === 0) {
    results.warnings.push('No upcoming events found - consider adding future events');
  }

  // Check for date conflicts (same date/time)
  const dateCounts = events.reduce((acc, event) => {
    const dateKey = new Date(event.date).toISOString();
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {});

  const conflicts = Object.entries(dateCounts).filter(([_date, count]) => count > 1);
  if (conflicts.length > 0) {
    results.warnings.push(
      `${conflicts.length} date conflicts found (multiple events at same time)`,
    );
  }
}

/**
 * Validate event images
 */
async function validateEventImages(events, results) {
  const eventsWithImages = events.filter((event) => event.image_url);
  const eventsWithoutImages = events.filter((event) => !event.image_url);

  console.log('\n🖼️ Event Images:');
  console.log(`   Events with images: ${eventsWithImages.length}`);
  console.log(`   Events without images: ${eventsWithoutImages.length}`);

  if (eventsWithoutImages.length > events.length * 0.2) {
    results.warnings.push(
      `${eventsWithoutImages.length} events missing images (${((eventsWithoutImages.length / events.length) * 100).toFixed(1)}%)`,
    );
  }
}

/**
 * Display validation results
 */
function displayValidationResults(results) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  console.log(`📊 Total Events: ${results.totalEvents}`);
  console.log(`✅ Valid Events: ${results.validEvents}`);
  console.log(`❌ Invalid Events: ${results.invalidEvents}`);
  console.log(`📅 Upcoming Events: ${results.upcomingEvents}`);
  console.log(`📜 Past Events: ${results.pastEvents}`);

  if (results.issues.length > 0) {
    console.log('\n❌ CRITICAL ISSUES:');
    results.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.title} (ID: ${issue.eventId})`);
      issue.issues.forEach((problemDesc) => {
        console.log(`   • ${problemDesc}`);
      });
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    results.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }

  if (results.invalidEvents === 0 && results.warnings.length === 0) {
    console.log('\n🎉 All events passed validation!');
    console.log('✅ Database is ready for production use.');
  } else if (results.invalidEvents === 0) {
    console.log('\n✅ All events are valid!');
    console.log("⚠️ Some warnings were found but they don't prevent functionality.");
  } else {
    console.log('\n❌ Critical issues found that need to be fixed.');
  }

  console.log('\n🌐 Test the platform:');
  console.log('   Events Page: http://localhost:8080/meetups');
  console.log('   Admin Panel: http://localhost:8080/admin/meetups');
}

/**
 * URL validation helper
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Test event booking functionality
 */
async function testEventBooking() {
  console.log('\n🧪 Testing Event Booking Functionality...');

  // This would require authentication, so we'll just validate the structure
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, max_attendees')
    .gte('date', new Date().toISOString())
    .limit(3);

  if (upcomingEvents && upcomingEvents.length > 0) {
    console.log('✅ Upcoming events available for booking testing');
    upcomingEvents.forEach((event) => {
      console.log(`   📅 ${event.title} (Max: ${event.max_attendees || 'Unlimited'})`);
    });
  } else {
    console.log('⚠️ No upcoming events available for booking tests');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const includeBookingTest = args.includes('--booking-test');

  try {
    const results = await validateEvents();

    if (includeBookingTest) {
      await testEventBooking();
    }

    const exitCode = results.invalidEvents > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Fatal validation error:', error);
    process.exit(1);
  }
}

main();
