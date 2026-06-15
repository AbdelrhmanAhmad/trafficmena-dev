// Guest Expert interface for events
export interface GuestExpert {
  name: string;
  bio: string;
  image_url: string;
}

// Extended event type with typed guest experts
export interface EventWithGuestExperts {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  max_attendees: number | null;
  event_type: 'Event' | 'Meetup' | 'Mastermind' | 'Retreat';
  guest_experts: GuestExpert[] | null;
  event_description: string | null;
  meeting_link: string | null;
  image_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}
