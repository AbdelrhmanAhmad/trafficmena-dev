import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseUsersListQuery } from '../../server/src/routes/api/users-list.ts';

describe('users list query parsing', () => {
  it('applies sane defaults for admin users listing', () => {
    const result = parseUsersListQuery({});

    assert.equal(result.success, true);

    if (!result.success) return;

    assert.equal(result.data.page, 1);
    assert.equal(result.data.pageSize, 20);
    assert.equal(result.data.subscription, 'all');
    assert.equal(result.data.search, undefined);
  });

  it('accepts search, role, and subscription filters', () => {
    const result = parseUsersListQuery({
      page: '2',
      pageSize: '200',
      search: ' eng.rowinathemida@gmail.com ',
      role: 'user',
      subscription: 'not_subscribed',
    });

    assert.equal(result.success, true);

    if (!result.success) return;

    assert.equal(result.data.page, 2);
    assert.equal(result.data.pageSize, 200);
    assert.equal(result.data.search, 'eng.rowinathemida@gmail.com');
    assert.equal(result.data.role, 'user');
    assert.equal(result.data.subscription, 'not_subscribed');
  });

  it('rejects pageSize values above 200', () => {
    const result = parseUsersListQuery({ page: '1', pageSize: '201' });

    assert.equal(result.success, false);
  });
});
