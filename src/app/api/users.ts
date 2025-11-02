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
};

type ApiUsersMeResponse = {
  user: AuthSessionUser | null;
  profile: ApiProfile;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  role: string | null;
  user_type: string | null;
};

type ApiAdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  role: string | null;
  userType: string | null;
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

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const data = await fetchJson<ApiUsersMeResponse>(`${API_BASE}/users/me`, {
    method: 'GET',
  });

  return {
    user: data.user,
    profile: mapProfile(data.profile),
  };
}

export async function fetchUsersAdmin(
  params: { page?: number; pageSize?: number } = {},
): Promise<AdminUsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const data = await fetchJson<{
    items: ApiAdminUser[];
    pagination: AdminUsersResponse['pagination'];
  }>(`${API_BASE}/users${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map((item) => ({
      id: item.id,
      email: item.email,
      name: item.name,
      created_at: item.createdAt,
      role: item.role,
      user_type: item.userType,
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
): Promise<{ success: boolean; message?: string }> {
  const body: Record<string, unknown> = {};

  if (payload.name !== undefined) body.name = payload.name;
  if (payload.first_name !== undefined) body.firstName = payload.first_name;
  if (payload.last_name !== undefined) body.lastName = payload.last_name;
  if (payload.phone_number !== undefined) body.phoneNumber = payload.phone_number;
  if (payload.experience_level !== undefined) body.experienceLevel = payload.experience_level;
  if (payload.primary_goal !== undefined) body.primaryGoal = payload.primary_goal;
  if (payload.primary_challenge !== undefined) body.primaryChallenge = payload.primary_challenge;

  return fetchJson<{ success: boolean; message?: string }>(`${API_BASE}/users/me`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
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
      role: response.user.role,
      user_type: response.user.userType,
    },
  };
}

export async function deleteUser(userId: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
  });
}
