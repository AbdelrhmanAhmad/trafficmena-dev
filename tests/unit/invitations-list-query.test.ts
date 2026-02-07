import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseInvitationListQuery } from '../../server/src/routes/api/invitations-list.ts';

describe('invitation list query parsing', () => {
  it('applies defaults for invitation listing', () => {
    const result = parseInvitationListQuery({});

    assert.equal(result.success, true);

    if (!result.success) return;

    assert.equal(result.data.page, 1);
    assert.equal(result.data.pageSize, 20);
    assert.equal(result.data.status, undefined);
    assert.equal(result.data.search, undefined);
  });

  it('accepts trimmed search and pageSize up to 200', () => {
    const result = parseInvitationListQuery({
      page: '3',
      pageSize: '200',
      status: 'pending',
      search: '  invited.user@example.com  ',
    });

    assert.equal(result.success, true);

    if (!result.success) return;

    assert.equal(result.data.page, 3);
    assert.equal(result.data.pageSize, 200);
    assert.equal(result.data.status, 'pending');
    assert.equal(result.data.search, 'invited.user@example.com');
  });

  it('rejects pageSize above 200', () => {
    const result = parseInvitationListQuery({ page: '1', pageSize: '201' });

    assert.equal(result.success, false);
  });
});
