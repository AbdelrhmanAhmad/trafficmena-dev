import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAdminDashboardPath } from '../../src/shared/utils/adminAccess.ts';

describe('admin access', () => {
  it('routes managers to the library dashboard', () => {
    assert.equal(getAdminDashboardPath('manager'), '/admin/library');
  });

  it('routes admins to the admin dashboard', () => {
    assert.equal(getAdminDashboardPath('admin'), '/admin');
  });
});
