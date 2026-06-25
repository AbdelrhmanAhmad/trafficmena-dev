import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { getOptionalUserRole } = await import('../../server/src/routes/api/utils.ts');

describe('getOptionalUserRole db client selection', () => {
  it('uses the injected db client so transaction callers stay on the transaction connection', async () => {
    let selectCalls = 0;
    const fakeDb = {
      select: () => {
        selectCalls += 1;
        return {
          from: () => ({
            where: () => ({
              limit: async () => [{ role: 'manager' }],
            }),
          }),
        };
      },
    } as Parameters<typeof getOptionalUserRole>[1];

    const role = await getOptionalUserRole('user-1', fakeDb);

    assert.equal(role, 'manager');
    assert.equal(selectCalls, 1);
  });
});
