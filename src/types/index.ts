// ==================================================================
// This file contains all the shared TypeScript types for the project.
// The new types for the RSVP feature have been added at the end.
// ==================================================================

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  created_at: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  css_variables: Record<string, string>;
  created_at: string;
}

export interface Memorial {
  id: string;
  owner_id: string;
  org_id: string | null;
  title: string;
  bio: string | null;
  birth_date: string | null;
  death_date: string | null;
  visibility: 'public' | 'unlisted' | 'family_only' | 'family_and_friends' | 'family_friends_fof';
  tier: 'free' | 'basic' | 'premium';
  profile_image_url: string | null;
  cover_image_url: string | null;
  theme_id: string | null;
  theme?: Theme;
  created_at: string;
  updated_at: string;
  total_visitors?: number;
}

interface TimelineEvent {
  id: string;
  memorial_id: string;
  title: string;
  description: string | null;
  event_date: string;
  media_ids: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TimelineEventFormData {
  title: string;
  description: string;
  event_date: string;
}

interface Tribute {
  id: string;
  memorial_id: string;
  author_id: string | null;
  parent_tribute_id: string | null;
  content: string;
  type: string;
  created_at: string;
  author?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  replies?: Tribute[];
}

interface Media {
  id: string;
  uploader_id: string;
  storage_path: string;
  entity_id: string | null;
  entity_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Post {
  id: string;
  author_id: string;
  content: string;
  visibility: 'public' | 'friends_only' | 'private';
  media_ids: string[];
  created_at: string;
  updated_at: string;
  author?: User;
  media?: Media[];
  like_count?: number;
}

interface PostInteraction {
  id: string;
  post_id: string;
  user_id: string;
  type: 'like';
  created_at: string;
}

interface UserConnection {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  cover_image_url: string | null;
  birth_date: string | null;
  location: string | null;
  external_links: Array<{ type: string; url: string }> | null;
  phone_number: string | null;
  last_seen_at: string | null;
  visibility: 'public' | 'friends_only' | 'private' | null;
  created_at: string;
  updated_at: string;
}

export type MemorialFormData = {
  title: string;
  bio: string;
  birth_date: string;
  death_date: string;
  visibility: 'public' | 'private' | 'friends_only';
  tier: 'free' | 'basic' | 'premium';
  org_id: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  theme_id: string | null;
};

type PostFormData = {
  content: string;
  visibility: 'public' | 'friends_only' | 'private';
  media?: File[];
};

export interface CommunityGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  privacy: 'public' | 'private' | 'secret';
  cover_image_url: string | null;
  member_count?: number;
  is_member?: boolean;
  is_admin?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  user?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export interface GroupPost {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  media_ids: string[];
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  like_count?: number;
}

export type EventVisibility = 'public' | 'family_only' | 'invitees_only';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location_text: string | null;
  visibility: EventVisibility;
  creator_id: string;
  memorial_id: string | null;
  event_type_id: string | null;
  location_type: 'physical' | 'online';
  cover_image_url: string | null;
  organization_id: string | null;
  status: 'draft' | 'published' | 'cancelled';
  tags?: string[];
  creator?: {
    id: string;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  memorial?: {
    id: string;
    title: string;
  } | null;
  event_types?: {
    id: string;
    name_en: string;
    icon?: string | null;
  } | null;
}

// ==================================================================
// START OF NEW/UPDATED TYPES FOR RSVP FEATURE
// ==================================================================

/**
 * Defines the possible RSVP statuses.
 * This corresponds to the `rsvp_status` ENUM in the database.
 * `null` represents a user who has not yet responded.
 * Note: 'accepted' will be displayed as 'Going' in the UI.
 */
export type RSVPStatus = "accepted" | "maybe" | "declined" | "invited" | null;

/**
 * Represents a single attendee of an event, including their profile information.
 * This is the expected shape of data when fetching attendees for an event,
 * typically by joining `event_attendees` with the `profiles` table.
 */
export interface EventAttendee {
  id: number;
  event_id: string;
  user_id: string;
  role: 'manager' | 'participant';
  status: RSVPStatus; // This is the attendee's RSVP status
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  invited_by: string | null;
  guest_email: string | null;
  // This nested object contains the attendee's public profile information
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ==================================================================
// END OF NEW/UPDATED TYPES
// ==================================================================