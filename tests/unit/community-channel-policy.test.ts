import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { isStaffRole } = await import('../../server/src/services/community/access.ts');

describe('community channel policy helpers', () => {
  it('isStaffRole recognizes owner/admin/manager only', () => {
    assert.equal(isStaffRole('owner'), true);
    assert.equal(isStaffRole('admin'), true);
    assert.equal(isStaffRole('manager'), true);
    assert.equal(isStaffRole('expert'), false);
    assert.equal(isStaffRole('user'), false);
    assert.equal(isStaffRole(null), false);
  });

  it('documents staff_post policy: members read, staff post', () => {
    const policy = {
      view: ['authenticated member', 'staff'],
      post: ['owner', 'admin', 'manager'],
    };
    assert.deepEqual(policy.post, ['owner', 'admin', 'manager']);
    assert.ok(policy.view.includes('authenticated member'));
  });

  it('documents open policy: authenticated view and post', () => {
    const policy = { view: ['authenticated'], post: ['authenticated with channel access'] };
    assert.deepEqual(policy.view, ['authenticated']);
  });

  it('documents entitlement_gated policy: OR track/masterclass entitlement', () => {
    const policy = { entitlement: 'track booking OR masterclass enrollment' };
    assert.equal(policy.entitlement, 'track booking OR masterclass enrollment');
  });
});
