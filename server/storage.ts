import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";
import {
  events, vendorPosts, messages, eventDates, eventAttendance, userProfiles, adminSettings,
  type Event, type InsertEvent, type VendorPost, type InsertVendorPost,
  type Message, type InsertMessage, type EventDate, type EventAttendance,
  type UserProfile, type InsertUserProfile, type AdminSetting,
} from "@shared/schema";

export interface IStorage {
  // Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  getAllUserProfiles(): Promise<UserProfile[]>;
  setAdminFlag(userId: string, isAdmin: boolean): Promise<void>;

  // Events
  getEvents(areaCode?: string): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent & { createdBy: string }): Promise<Event>;
  updateVendorSpacesUsed(eventId: number, delta: number): Promise<void>;

  // Event Dates
  getEventDates(eventId: number): Promise<EventDate[]>;
  createEventDate(data: { eventId: number; date: Date }): Promise<EventDate>;
  deleteEventDates(eventId: number): Promise<void>;

  // Attendance
  getEventAttendance(eventId: number): Promise<EventAttendance[]>;
  getUserAttendance(userId: string): Promise<EventAttendance[]>;
  setAttendance(eventId: number, userId: string, status: string): Promise<EventAttendance>;
  removeAttendance(eventId: number, userId: string): Promise<void>;
  getUserStatusForEvent(eventId: number, userId: string): Promise<string | null>;

  // Vendor Posts
  getVendorPosts(eventId: number): Promise<VendorPost[]>;
  createVendorPost(post: InsertVendorPost & { vendorId: string }): Promise<VendorPost>;

  // Messages
  getMessages(areaCode?: string): Promise<Message[]>;
  createMessage(message: InsertMessage & { senderId: string }): Promise<Message>;

  // Admin Settings
  getAdminSettings(): Promise<AdminSetting[]>;
  getAdminSetting(key: string): Promise<string | undefined>;
  upsertAdminSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ---- Profiles ----
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [p] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return p;
  }

  async upsertUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [p] = await db
      .insert(userProfiles)
      .values({ userId, ...profile })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { ...profile, updatedAt: new Date() } })
      .returning();
    return p;
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return await db.select().from(userProfiles);
  }

  async setAdminFlag(userId: string, isAdmin: boolean): Promise<void> {
    await db
      .insert(userProfiles)
      .values({ userId, isAdmin })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { isAdmin, updatedAt: new Date() } });
  }

  // ---- Events ----
  async getEvents(areaCode?: string): Promise<Event[]> {
    if (areaCode) {
      return await db.select().from(events).where(eq(events.areaCode, areaCode)).orderBy(desc(events.createdAt));
    }
    return await db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [e] = await db.select().from(events).where(eq(events.id, id));
    return e;
  }

  async createEvent(event: InsertEvent & { createdBy: string }): Promise<Event> {
    const [e] = await db.insert(events).values(event).returning();
    return e;
  }

  async updateVendorSpacesUsed(eventId: number, delta: number): Promise<void> {
    const [e] = await db.select().from(events).where(eq(events.id, eventId));
    if (e) {
      const newUsed = Math.max(0, (e.vendorSpacesUsed || 0) + delta);
      await db.update(events).set({ vendorSpacesUsed: newUsed }).where(eq(events.id, eventId));
    }
  }

  // ---- Event Dates ----
  async getEventDates(eventId: number): Promise<EventDate[]> {
    return await db.select().from(eventDates).where(eq(eventDates.eventId, eventId)).orderBy(eventDates.date);
  }

  async createEventDate(data: { eventId: number; date: Date }): Promise<EventDate> {
    const [d] = await db.insert(eventDates).values(data).returning();
    return d;
  }

  async deleteEventDates(eventId: number): Promise<void> {
    await db.delete(eventDates).where(eq(eventDates.eventId, eventId));
  }

  // ---- Attendance ----
  async getEventAttendance(eventId: number): Promise<EventAttendance[]> {
    return await db.select().from(eventAttendance).where(eq(eventAttendance.eventId, eventId));
  }

  async getUserAttendance(userId: string): Promise<EventAttendance[]> {
    return await db.select().from(eventAttendance).where(eq(eventAttendance.userId, userId));
  }

  async setAttendance(eventId: number, userId: string, status: string): Promise<EventAttendance> {
    const [a] = await db
      .insert(eventAttendance)
      .values({ eventId, userId, status })
      .onConflictDoUpdate({
        target: [eventAttendance.eventId, eventAttendance.userId],
        set: { status },
      })
      .returning();
    return a;
  }

  async removeAttendance(eventId: number, userId: string): Promise<void> {
    await db.delete(eventAttendance).where(
      and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.userId, userId))
    );
  }

  async getUserStatusForEvent(eventId: number, userId: string): Promise<string | null> {
    const [a] = await db.select().from(eventAttendance).where(
      and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.userId, userId))
    );
    return a?.status ?? null;
  }

  // ---- Vendor Posts ----
  async getVendorPosts(eventId: number): Promise<VendorPost[]> {
    return await db.select().from(vendorPosts).where(eq(vendorPosts.eventId, eventId)).orderBy(desc(vendorPosts.createdAt));
  }

  async createVendorPost(post: InsertVendorPost & { vendorId: string }): Promise<VendorPost> {
    const [p] = await db.insert(vendorPosts).values(post).returning();
    return p;
  }

  // ---- Messages ----
  async getMessages(areaCode?: string): Promise<Message[]> {
    if (areaCode) {
      return await db.select().from(messages).where(eq(messages.areaCode, areaCode)).orderBy(desc(messages.createdAt));
    }
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage & { senderId: string }): Promise<Message> {
    const [m] = await db.insert(messages).values(message).returning();
    return m;
  }

  // ---- Admin Settings ----
  async getAdminSettings(): Promise<AdminSetting[]> {
    return await db.select().from(adminSettings);
  }

  async getAdminSetting(key: string): Promise<string | undefined> {
    const [s] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    return s?.value;
  }

  async upsertAdminSetting(key: string, value: string): Promise<void> {
    await db
      .insert(adminSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: adminSettings.key, set: { value, updatedAt: new Date() } });
  }
}

export const storage = new DatabaseStorage();
