import { z } from 'zod';

const invitationStatusValues = ['pending', 'sent', 'accepted', 'expired', 'failed'] as const;

export const invitationsListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(20),
  status: z.enum(invitationStatusValues).optional(),
  search: z.string().max(120).optional(),
});

export type InvitationsListQuery = z.infer<typeof invitationsListQuerySchema>;

export function parseInvitationListQuery(input: unknown) {
  const parsed = invitationsListQuerySchema.safeParse(input);
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
