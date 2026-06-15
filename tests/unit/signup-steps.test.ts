import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SIGNUP_OTP_STEP,
  SIGNUP_TOTAL_STEPS,
} from '../../src/shared/components/layout/signupSteps.ts';

describe('signup step mapping', () => {
  it('treats OTP entry as step 6', () => {
    assert.equal(SIGNUP_TOTAL_STEPS, 6);
    assert.equal(SIGNUP_OTP_STEP, 6);
  });
});
