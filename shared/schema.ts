import { pgTable, text, serial, timestamp, integer, varchar, boolean, jsonb, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  profileType: text("profile_type").notNull().default("general"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  areaCode: text("area_code"),
  bio: text("bio"),
  businessName: text("business_name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  isAdmin: boolean("is_admin").default(false),
  onboardingComplete: boolean("onboarding_complete").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  areaCode: text("area_code"),
  date: timestamp("date").notNull(),
  vendorSpaces: integer("vendor_spaces").default(0),
  vendorSpacesUsed: integer("vendor_spaces_used").default(0),
  spotPrice: integer("spot_price_cents").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  canceledAt: timestamp("canceled_at"),
});

export const eventDates = pgTable("event_dates", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendance = pgTable("event_attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique("event_attendance_event_user_unique").on(t.eventId, t.userId)]);

export const vendorPosts = pgTable("vendor_posts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  itemsDescription: text("items_description").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array().default([]),
  isVendorPro: boolean("is_vendor_pro").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  areaCode: text("area_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fromUserId: varchar("from_user_id").references(() => users.id),
  type: text("type").notNull().default("event"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  eventId: integer("event_id").references(() => events.id),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventMaps = pgTable("event_maps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().unique().references(() => events.id),
  mapData: jsonb("map_data").notNull().default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorRegistrations = pgTable("vendor_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  spotId: text("spot_id"),
  spotName: text("spot_name"),
  amountCents: integer("amount_cents").default(0),
  feeCents: integer("fee_cents").default(0),
  isPro: boolean("is_pro").default(false),
  status: text("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const termsAcceptances = pgTable("terms_acceptances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  tier: text("tier").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow(),
});

export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  profileUserId: varchar("profile_user_id").notNull().references(() => users.id),
  viewerUserId: varchar("viewer_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorInventory = pgTable("vendor_inventory", {
  id: serial("id").primaryKey(),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  itemName: text("item_name").notNull(),
  quantityBrought: integer("quantity_brought").notNull().default(0),
  quantitySold: integer("quantity_sold").notNull().default(0),
  priceCents: integer("price_cents").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- Schemas ----
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdBy: true, createdAt: true, vendorSpacesUsed: true });
export const insertEventDateSchema = createInsertSchema(eventDates).omit({ id: true, createdAt: true });
export const insertEventAttendanceSchema = createInsertSchema(eventAttendance).omit({ id: true, userId: true, createdAt: true });
export const insertVendorPostSchema = createInsertSchema(vendorPosts).omit({ id: true, vendorId: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, senderId: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertVendorRegistrationSchema = createInsertSchema(vendorRegistrations).omit({ id: true, createdAt: true });
export const insertVendorInventorySchema = createInsertSchema(vendorInventory).omit({ id: true, vendorId: true, createdAt: true, updatedAt: true });

// ---- Types ----
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type CreateEventRequest = InsertEvent;

export type EventDate = typeof eventDates.$inferSelect;
export type EventAttendance = typeof eventAttendance.$inferSelect;

export type VendorPost = typeof vendorPosts.$inferSelect;
export type InsertVendorPost = z.infer<typeof insertVendorPostSchema>;
export type CreateVendorPostRequest = InsertVendorPost;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CreateMessageRequest = InsertMessage;

export type AdminSetting = typeof adminSettings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type EventMap = typeof eventMaps.$inferSelect;
export type VendorRegistration = typeof vendorRegistrations.$inferSelect;
export type TermsAcceptance = typeof termsAcceptances.$inferSelect;
export type ProfileView = typeof profileViews.$inferSelect;
export type VendorInventoryItem = typeof vendorInventory.$inferSelect;
export type InsertVendorInventory = z.infer<typeof insertVendorInventorySchema>;

// ---- API Contract Types ----
export type EventResponse = Event & {
  creatorName?: string | null;
  creatorTier?: string | null;
  extraDates?: EventDate[];
  attendingCount?: number;
  interestedCount?: number;
  vendorAttendees?: VendorPostResponse[];
  userStatus?: string | null;
  isFeatured?: boolean;
};
export type VendorPostResponse = VendorPost & { vendorName?: string | null; vendorAvatar?: string | null };
export type MessageResponse = Message & { senderName?: string | null; senderAvatar?: string | null };
export type UserProfileResponse = UserProfile & { user?: any };

export * from "./models/auth";
