import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatManualEnrollmentAmountEgp,
  parseManualEnrollmentAmountEgp,
} from '../../src/features/tracks/utils/manualEnrollmentAmount.ts';

describe('track manual enrollment amount helpers', () => {
  it('formats cents as human-readable EGP for the form', () => {
    assert.equal(formatManualEnrollmentAmountEgp(100000), '1000');
    assert.equal(formatManualEnrollmentAmountEgp(100050), '1000.5');
    assert.equal(formatManualEnrollmentAmountEgp(100025), '1000.25');
    assert.equal(formatManualEnrollmentAmountEgp(0), '');
  });

  it('parses human-readable EGP amounts into cents', () => {
    assert.equal(parseManualEnrollmentAmountEgp('800'), 80000);
    assert.equal(parseManualEnrollmentAmountEgp('100 EGP'), 10000);
    assert.equal(parseManualEnrollmentAmountEgp('1,250.50'), 125050);
    assert.equal(parseManualEnrollmentAmountEgp('1,250'), 125000);
  });

  it('rejects invalid EGP inputs', () => {
    assert.equal(parseManualEnrollmentAmountEgp(''), null);
    assert.equal(parseManualEnrollmentAmountEgp('abc'), null);
    assert.equal(parseManualEnrollmentAmountEgp('-5'), null);
    assert.equal(parseManualEnrollmentAmountEgp('100,50'), null);
    assert.equal(parseManualEnrollmentAmountEgp('100000.01'), null);
  });
});
