import { API_BASE, fetchJson } from './client';

export type AuthSessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

type ApiProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string | null;
  userType: string | null;
  experienceLevel: string | null;
  primaryGoal: string | null;
  primaryChallenge: string | null;
  subscriptionStatus: string | null;
} | null;

export type ProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string | null;
  user_type: string | null;
  experience_level: string | null;
  primary_goal: string | null;
  primary_challenge: string | null;
  subscription_status: string | null;
};

const mapProfile = (profile: ApiProfile): ProfileRecord | null =>
  profile
    ? {
        id: profile.id,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone_number: profile.phoneNumber,
        role: profile.role,
        user_type: profile.userType,
        experience_level: profile.experienceLevel,
        primary_goal: profile.primaryGoal,
        primary_challenge: profile.primaryChallenge,
        subscription_status: profile.subscriptionStatus,
      }
    : null;

export type CurrentUserResponse = {
  user: AuthSessionUser | null;
  profile: ProfileRecord | null;
  totalPaidPurchases: number;
  totalRegistrations: number;
  /** Revenue in EGP currency units (not cents). Converted from API's totalRevenueCents / 100. */
  totalRevenue: number;
  accountCreationDate: string;
};

type ApiUsersMeResponse = {
  user: AuthSessionUser | null;
  profile: ApiProfile;
  totalPaidPurchases?: number;
  totalRegistrations?: number;
  totalRevenueCents?: number;
  accountCreationDate?: string | null;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  phone_number: string | null;
  role: string | null;
  user_type: string | null;
  is_subscriber?: boolean;
  active_subscription_source?: 'paid' | 'legacy' | 'gift' | null;
};

type ApiAdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  phoneNumber: string | null;
  role: string | null;
  userType: string | null;
  isSubscriber: boolean;
  activeSubscriptionSource: 'paid' | 'legacy' | 'gift' | null;
};

export type AdminUsersResponse = {
  items: AdminUserRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type UserRoleValue = 'owner' | 'admin' | 'manager' | 'expert' | 'user';
export type AdminUsersSubscriptionFilter = 'all' | 'subscribed' | 'not_subscribed';
export type FetchUsersAdminParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRoleValue;
  subscription?: AdminUsersSubscriptionFilter;
  fields?: 'full' | 'basic';
};

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const data = await fetchJson<ApiUsersMeResponse>(`${API_BASE}/users/me`);

  return {
    user: data.user,
    profile: mapProfile(data.profile),
    totalPaidPurchases: data.totalPaidPurchases ?? 0,
    totalRegistrations: data.totalRegistrations ?? 0,
    totalRevenue: (data.totalRevenueCents ?? 0) / 100,
    accountCreationDate: data.accountCreationDate ?? '',
  };
}

export async function fetchUsersAdmin(
  params: FetchUsersAdminParams = {},
): Promise<AdminUsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const normalizedSearch = params.search?.trim();
  if (normalizedSearch) query.set('search', normalizedSearch);
  if (params.role) query.set('role', params.role);
  if (params.subscription && params.subscription !== 'all') {
    query.set('subscription', params.subscription);
  }
  if (params.fields === 'basic') query.set('fields', 'basic');

  const data = await fetchJson<{
    items: ApiAdminUser[];
    pagination: AdminUsersResponse['pagination'];
  }>(`${API_BASE}/users${query.toString() ? `?${query.toString()}` : ''}`);

  return {
    items: (data.items ?? []).map((item) => ({
      id: item.id,
      email: item.email,
      name: item.name,
      created_at: item.createdAt,
      phone_number: item.phoneNumber ?? null,
      role: item.role,
      user_type: item.userType,
      is_subscriber: item.isSubscriber,
      active_subscription_source: item.activeSubscriptionSource ?? null,
    })),
    pagination: data.pagination,
  };
}

export type UpdateCurrentUserPayload = Partial<{
  name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  experience_level: string;
  primary_goal: string;
  primary_challenge: string;
}>;

export async function updateCurrentUser(
  payload: UpdateCurrentUserPayload,
  options?: { mode?: 'signup' },
): Promise<{ success: boolean; message?: string }> {
  const body: Record<string, unknown> = {};

  if (payload.name !== undefined) body.name = payload.name;
  if (payload.first_name !== undefined) body.firstName = payload.first_name;
  if (payload.last_name !== undefined) body.lastName = payload.last_name;
  if (payload.phone_number !== undefined) body.phoneNumber = payload.phone_number;
  if (payload.experience_level !== undefined) body.experienceLevel = payload.experience_level;
  if (payload.primary_goal !== undefined) body.primaryGoal = payload.primary_goal;
  if (payload.primary_challenge !== undefined) body.primaryChallenge = payload.primary_challenge;

  const query = options?.mode ? `?mode=${options.mode}` : '';
  return fetchJson<{ success: boolean; message?: string }>(`${API_BASE}/users/me${query}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function updateCurrentUserSignup(
  payload: UpdateCurrentUserPayload,
): Promise<{ success: boolean; message?: string }> {
  return updateCurrentUser(payload, { mode: 'signup' });
}

export async function updateUserRole(
  userId: string,
  role: UserRoleValue,
): Promise<{ success: boolean; user: AdminUserRecord }> {
  const response = await fetchJson<{
    success: boolean;
    user: ApiAdminUser;
  }>(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

  return {
    success: response.success,
    user: {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      created_at: response.user.createdAt,
      phone_number: response.user.phoneNumber ?? null,
      role: response.user.role,
      user_type: response.user.userType,
      is_subscriber: response.user.isSubscriber,
      active_subscription_source: response.user.activeSubscriptionSource ?? null,
    },
  };
}

export async function deleteUser(userId: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
  });
}
