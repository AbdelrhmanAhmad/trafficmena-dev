import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { isEventHiddenFromNonStaff } from '../../server/src/routes/api/eventVisibility.ts';

describe('isEventHiddenFromNonStaff (D-1 booking-path draft guard)', () => {
  it('hides a draft event from non-staff', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: false,
        linkedTrackIsPublished: null,
        isStaff: false,
      }),
      true,
    );
  });

  it('hides a published event whose linked track is unpublished', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: false,
        isStaff: false,
      }),
      true,
    );
  });

  it('shows a published standalone event to non-staff', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: null,
        isStaff: false,
      }),
      false,
    );
  });

  it('shows a published event in a published track to non-staff', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: true,
        isStaff: false,
      }),
      false,
    );
  });

  it('lets staff through even for a draft event', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: false,
        linkedTrackIsPublished: null,
        isStaff: true,
      }),
      false,
    );
  });

  it('lets staff through even when the linked track is unpublished', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: false,
        isStaff: true,
      }),
      false,
    );
  });
});

describe('draft visibility route wiring', () => {
  it('keeps the register route behind the shared draft guard', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );
    const routeStart = source.indexOf("'/events/:id/register'");
    const guardCall = source.indexOf('isEventHiddenFromNonStaff', routeStart);

    assert.ok(routeStart >= 0);
    assert.ok(guardCall > routeStart);
  });

  it('uses the transaction client for payment price role lookup', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    const calculateStart = source.indexOf('async function calculatePrice');
    const roleLookup = source.indexOf('getOptionalUserRole(userId, dbClient)', calculateStart);
    const draftGuard = source.indexOf('isEventHiddenFromNonStaff', calculateStart);
    const trackBranch = source.indexOf("if (itemType === 'track'", calculateStart);

    assert.ok(calculateStart >= 0);
    assert.ok(roleLookup > calculateStart);
    assert.ok(draftGuard > roleLookup);
    assert.ok(trackBranch > draftGuard);
  });

  it('keeps checkout and price preview wired through calculatePrice', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    const checkoutRoute = source.indexOf("app.post('/payments/checkout'");
    // Whitespace-tolerant: calculatePrice is now called with a trailing ticketType arg (multi-line).
    const checkoutPrice = source.indexOf('await calculatePrice(', checkoutRoute);
    const previewRoute = source.indexOf("app.get('/payments/price-preview'");
    const previewPrice = source.indexOf('await calculatePrice(', previewRoute);

    assert.ok(checkoutRoute >= 0);
    assert.ok(checkoutPrice > checkoutRoute);
    assert.ok(previewRoute > checkoutPrice);
    assert.ok(previewPrice > previewRoute);
    // Preview still prices against the session user.
    assert.ok(source.indexOf('session.user.id', previewPrice) > previewPrice);
  });

  it('keeps the publish-now toast in sync with React Hook Form state', async () => {
    const source = await readFile(
      new URL('../../src/features/events/components/AdminEventForm.tsx', import.meta.url),
      'utf8',
    );
    const toastAction = source.indexOf('void handlePublishNow()');
    const publishHandler = source.indexOf('const handlePublishNow');
    const setPublished = source.indexOf("form.setValue('isPublished', true", publishHandler);

    assert.ok(toastAction >= 0);
    assert.ok(publishHandler >= 0);
    assert.ok(setPublished > publishHandler);
  });

  it('does not describe saved drafts as visible to members', async () => {
    const source = await readFile(
      new URL('../../src/features/events/hooks/useEvents.ts', import.meta.url),
      'utf8',
    );

    assert.match(source, /event\.is_published/);
    assert.match(source, /Draft saved\. Publish it when it is ready for members\./);
    assert.match(source, /Draft changes saved\. Members cannot see this event yet\./);
  });
});
