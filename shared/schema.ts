import { pgTable, text, serial, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  date: timestamp("date").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorPosts = pgTable("vendor_posts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  itemsDescription: text("items_description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdBy: true, createdAt: true });
export const insertVendorPostSchema = createInsertSchema(vendorPosts).omit({ id: true, vendorId: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, senderId: true, createdAt: true });

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type CreateEventRequest = InsertEvent;

export type VendorPost = typeof vendorPosts.$inferSelect;
export type InsertVendorPost = z.infer<typeof insertVendorPostSchema>;
export type CreateVendorPostRequest = InsertVendorPost;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CreateMessageRequest = InsertMessage;

// API Contract Types
export type EventResponse = Event & { creatorName?: string | null };
export type VendorPostResponse = VendorPost & { vendorName?: string | null, vendorAvatar?: string | null };
export type MessageResponse = Message & { senderName?: string | null, senderAvatar?: string | null };

export * from "./models/auth";
