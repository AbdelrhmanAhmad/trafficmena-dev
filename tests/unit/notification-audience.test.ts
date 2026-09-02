import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const {
  audienceRefToSpec,
  audienceSpecToRef,
  dedupeAudienceUserIds,
} = await import('../../server/src/services/notifications/recipients.ts');

const specs = [
  { type: 'all_users' as const },
  { type: 'event_attendees' as const, eventId: '11111111-1111-4111-8111-111111111111' },
  { type: 'track_buyers' as const, trackId: '22222222-2222-4222-8222-222222222222' },
  {
    type: 'masterclass_enrollees' as const,
    masterclassId: '33333333-3333-4333-8333-333333333333',
  },
  {
    type: 'activity_channel_members' as const,
    channelId: '44444444-4444-4444-8444-444444444444',
  },
  { type: 'role_based' as const, roles: ['manager', 'admin'] },
  {
    type: 'explicit_users' as const,
    userIds: [
      '55555555-5555-4555-8555-555555555555',
      '66666666-6666-4666-8666-666666666666',
    ],
  },
];

describe('notification audience — spec/ref roundtrip', () => {
  it('audienceSpecToRef → audienceRefToSpec preserves each audience type', () => {
    for (const spec of specs) {
      const { audienceType, audienceRef } = audienceSpecToRef(spec);
      const roundtripped = audienceRefToSpec(audienceType, audienceRef);
      assert.deepEqual(roundtripped, spec, `roundtrip failed for ${spec.type}`);
    }
  });

  it('audienceRefToSpec returns null for incomplete refs', () => {
    assert.equal(audienceRefToSpec('event_attendees', {}), null);
    assert.equal(audienceRefToSpec('track_buyers', { trackId: 123 }), null);
    assert.equal(audienceRefToSpec('role_based', { roles: 'admin' }), null);
    assert.equal(audienceRefToSpec('unknown_type', {}), null);
  });
});

describe('notification audience — dedupe', () => {
  it('dedupeAudienceUserIds removes duplicates and empty values', () => {
    assert.deepEqual(
      dedupeAudienceUserIds(['a', 'b', 'a', '', 'c', 'b']),
      ['a', 'b', 'c'],
    );
  });

  it('dedupeAudienceUserIds preserves first-seen order', () => {
    assert.deepEqual(dedupeAudienceUserIds(['z', 'y', 'z', 'x']), ['z', 'y', 'x']);
  });
});
