import { db } from "./db";
import { events, vendorPosts, messages, type Event, type InsertEvent, type VendorPost, type InsertVendorPost, type Message, type InsertMessage } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  getVendorPosts(eventId: number): Promise<VendorPost[]>;
  createVendorPost(post: InsertVendorPost): Promise<VendorPost>;
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async getVendorPosts(eventId: number): Promise<VendorPost[]> {
    return await db.select().from(vendorPosts).where(eq(vendorPosts.eventId, eventId)).orderBy(desc(vendorPosts.createdAt));
  }

  async createVendorPost(post: InsertVendorPost): Promise<VendorPost> {
    const [newPost] = await db.insert(vendorPosts).values(post).returning();
    return newPost;
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
