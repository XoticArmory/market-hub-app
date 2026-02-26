import { pgTable, text, serial, timestamp, integer, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  profileType: text("profile_type").notNull().default("general"), // 'event_owner' | 'vendor' | 'general'
  areaCode: text("area_code"),
  bio: text("bio"),
  businessName: text("business_name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"), // 'active' | 'inactive' | 'canceled'
  isAdmin: boolean("is_admin").default(false),
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
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  status: text("status").notNull(), // 'attending' | 'interested'
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorPosts = pgTable("vendor_posts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  itemsDescription: text("items_description").notNull(),
  imageUrl: text("image_url"),
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

// ---- Schemas ----
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdBy: true, createdAt: true, vendorSpacesUsed: true });
export const insertEventDateSchema = createInsertSchema(eventDates).omit({ id: true, createdAt: true });
export const insertEventAttendanceSchema = createInsertSchema(eventAttendance).omit({ id: true, userId: true, createdAt: true });
export const insertVendorPostSchema = createInsertSchema(vendorPosts).omit({ id: true, vendorId: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, senderId: true, createdAt: true });

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

// ---- API Contract Types ----
export type EventResponse = Event & {
  creatorName?: string | null;
  extraDates?: EventDate[];
  attendingCount?: number;
  interestedCount?: number;
  vendorAttendees?: VendorPostResponse[];
  userStatus?: string | null;
};
export type VendorPostResponse = VendorPost & { vendorName?: string | null; vendorAvatar?: string | null };
export type MessageResponse = Message & { senderName?: string | null; senderAvatar?: string | null };
export type UserProfileResponse = UserProfile & { user?: any };

export * from "./models/auth";
