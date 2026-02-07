type TrackBookingRow = {
  id: string;
};

export const hasTrackBookingRow = (bookingRows: TrackBookingRow[] | null | undefined): boolean => {
  return Array.isArray(bookingRows) && bookingRows.length > 0;
};
