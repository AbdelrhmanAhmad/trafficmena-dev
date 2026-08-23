// An event is discoverable and bookable by non-staff only when it is published AND, if it belongs
// to a track, that track is published too. Staff bypass (they preview and manage drafts). This
// mirrors the list/detail visibility rule so the booking endpoints (register, price-preview,
// checkout) return the same 404 instead of letting someone who knows a draft's id register for it
// or pay for it — most realistically an event that was published, taken, then unpublished. (D-1)
export function isEventHiddenFromNonStaff(params: {
  isPublished: boolean;
  // The linked track's publish state, or null when the event belongs to no track.
  linkedTrackIsPublished: boolean | null;
  isStaff: boolean;
}): boolean {
  if (params.isStaff) {
    return false;
  }
  if (!params.isPublished) {
    return true;
  }
  return params.linkedTrackIsPublished === false;
}
