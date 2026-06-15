export type TrackBookingState = 'available' | 'pending' | 'booked';

type TrackBookingStateInput = {
  userHasBooked?: boolean | null;
  userHasPendingPayment?: boolean | null;
};

export const getTrackBookingState = ({
  userHasBooked,
  userHasPendingPayment,
}: TrackBookingStateInput): TrackBookingState => {
  if (userHasBooked) return 'booked';
  if (userHasPendingPayment) return 'pending';
  return 'available';
};
