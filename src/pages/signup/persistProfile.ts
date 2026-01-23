import { updateCurrentUserSignup } from '@/app/api/users';
import {
  SIGNUP_CURRENT_STEP_KEY,
  SIGNUP_FORM_DATA_KEY,
  type SignUpFormData,
} from '@/shared/components/layout/SignUpLayout';
import { getLocalStorageItem, removeLocalStorageItem } from '@/shared/utils/localStorage';

const SIGNUP_CACHE_KEYS = [SIGNUP_FORM_DATA_KEY, SIGNUP_CURRENT_STEP_KEY] as const;

function resolveFormData(override?: SignUpFormData): SignUpFormData | null {
  if (override) {
    return override;
  }

  const stored = getLocalStorageItem<SignUpFormData>(SIGNUP_FORM_DATA_KEY);
  if (!stored.success || !stored.data) {
    return null;
  }

  return stored.data;
}

function clearSignupCache() {
  for (const key of SIGNUP_CACHE_KEYS) {
    removeLocalStorageItem(key);
  }
}

export async function persistSignupProfile(override?: SignUpFormData) {
  const data = resolveFormData(override);
  if (!data) {
    clearSignupCache();
    return;
  }

  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();
  const phone = data.phoneNumber?.trim();
  const primaryGoal = data.primaryGoal?.trim();
  const primaryChallenge = data.primaryChallenge?.trim();

  const payload: Record<string, string> = {};
  if (firstName) payload.first_name = firstName;
  if (lastName) payload.last_name = lastName;
  if (firstName || lastName) {
    payload.name = [firstName, lastName].filter(Boolean).join(' ');
  }
  if (phone) payload.phone_number = phone;
  if (primaryGoal) payload.primary_goal = primaryGoal;
  if (primaryChallenge) payload.primary_challenge = primaryChallenge;

  if (Object.keys(payload).length === 0) {
    clearSignupCache();
    return;
  }

  try {
    await updateCurrentUserSignup(payload);
  } catch (error) {
    console.warn('[signup] failed to persist profile data', error);
  } finally {
    clearSignupCache();
  }
}
