import { z } from 'zod';

const roleValues = ['owner', 'admin', 'manager', 'expert', 'user'] as const;
const subscriptionValues = ['all', 'subscribed', 'not_subscribed'] as const;

const fieldsValues = ['full', 'basic'] as const;

export const usersListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(20),
  search: z.string().max(120).optional(),
  role: z.enum(roleValues).optional(),
  subscription: z.enum(subscriptionValues).default('all'),
  fields: z.enum(fieldsValues).default('full'),
});

export type UsersListQuery = z.infer<typeof usersListQuerySchema>;
export type UsersListRole = NonNullable<UsersListQuery['role']>;
export type UsersListSubscription = UsersListQuery['subscription'];

export function parseUsersListQuery(input: unknown) {
  const parsed = usersListQuerySchema.safeParse(input);
  if (!parsed.success) return parsed;

  const normalizedSearch = parsed.data.search?.trim();

  return {
    success: true as const,
    data: {
      ...parsed.data,
      search: normalizedSearch ? normalizedSearch : undefined,
    },
  };
}
