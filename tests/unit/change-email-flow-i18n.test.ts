import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const changeEmailFlow = readFileSync(
  join(import.meta.dirname, '../../src/shared/components/ChangeEmailFlow.tsx'),
  'utf8',
);

describe('ChangeEmailFlow i18n wiring', () => {
  it('uses auth.changeEmail namespace keys instead of hardcoded UI copy', () => {
    assert.match(changeEmailFlow, /useTranslation\('auth'\)/);
    assert.match(changeEmailFlow, /t\('changeEmail\.label'\)/);
    assert.match(changeEmailFlow, /t\('changeEmail\.step1Title'\)/);
    assert.match(changeEmailFlow, /t\('changeEmail\.step2Title'\)/);
    assert.match(changeEmailFlow, /t\('changeEmail\.step3Title'\)/);
    assert.match(changeEmailFlow, /t\('changeEmail\.errors\.sendFailed'\)/);
    assert.match(changeEmailFlow, /t\('changeEmail\.toast\.updatedDesc'/);
    assert.doesNotMatch(changeEmailFlow, />Change email</);
    assert.doesNotMatch(changeEmailFlow, /Send code to current email/);
    assert.doesNotMatch(changeEmailFlow, /Verify & update/);
  });

  it('uses logical RTL margin classes for loading spinner', () => {
    assert.match(changeEmailFlow, /me-2 h-4 w-4 animate-spin/);
    assert.doesNotMatch(changeEmailFlow, /mr-2 h-4 w-4 animate-spin/);
  });
});
