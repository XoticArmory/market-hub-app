import type { UserProfile, Event, VendorPost, Message, Notification, EventAttendance, VendorRegistration } from "@workspace/db";

export type EventResponse = Event & {
  creatorName?: string | null;
  creatorTier?: string | null;
  creatorWebsiteUrl?: string | null;
  extraDates?: Array<{ id: number; eventId: number; date: string; createdAt: string }>;
  attendingCount?: number;
  interestedCount?: number;
  userStatus?: string | null;
  isFeatured?: boolean;
  spotPrice?: number;
};

export type VendorPostResponse = VendorPost & {
  vendorName?: string | null;
  vendorAvatar?: string | null;
};

export type CreateVendorPostRequest = {
  content?: string | null;
  imageUrl?: string | null;
};

export type UserProfileResponse = UserProfile & {
  user?: any;
};
