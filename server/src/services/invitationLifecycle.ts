export type InvitationLifecycleState = {
  status: string;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  activatedAt: Date | null;
};

export type InvitationLifecycleFailure =
  | 'expired'
  | 'invalid_status'
  | 'not_accepted'
  | 'already_activated';

export function isInvitationExpired(state: InvitationLifecycleState, now = new Date()): boolean {
  if (state.status === 'expired') {
    return true;
  }
  return Boolean(state.expiresAt && state.expiresAt.getTime() < now.getTime());
}

export function getActivationBlockReason(
  state: InvitationLifecycleState,
  now = new Date(),
): InvitationLifecycleFailure | null {
  if (isInvitationExpired(state, now)) {
    return 'expired';
  }
  if (state.status === 'failed') {
    return 'invalid_status';
  }
  if (!state.acceptedAt) {
    return 'not_accepted';
  }
  if (state.activatedAt) {
    return 'already_activated';
  }
  return null;
}
