import { db, pool } from "./db";
import { eq, desc, and, inArray, sql, gte, or, isNull, lt } from "drizzle-orm";
import {
  events, vendorPosts, messages, eventDates, eventAttendance, userProfiles, adminSettings,
  notifications, eventMaps, vendorRegistrations, termsAcceptances, profileViews, vendorInventory,
  vendorCatalog, vendorCatalogAssignments, roadmapItems,
  promoCodes, promoCodeUses, anonymousEventClicks, eventVendorEntries,
  type Event, type InsertEvent, type VendorPost, type InsertVendorPost,
  type Message, type InsertMessage, type EventDate, type EventAttendance,
  type UserProfile, type InsertUserProfile, type AdminSetting,
  type Notification, type EventMap, type VendorRegistration,
  type VendorInventoryItem, type InsertVendorInventory,
  type RoadmapItem, type InsertRoadmapItem,
  type VendorCatalogItem, type InsertVendorCatalog, type VendorCatalogAssignment,
  type EventVendorEntry,
} from "@shared/schema";
import { users } from "@shared/models/auth";

export interface IStorage {
  // Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  getAllUserProfiles(): Promise<UserProfile[]>;
  setAdminFlag(userId: string, isAdmin: boolean): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;

  // Events
  getEvents(areaCode?: string): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByOwner(ownerId: string): Promise<Event[]>;
  createEvent(event: InsertEvent & { createdBy: string }): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  cancelEvent(id: number): Promise<void>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event>;
  transferEventOwnership(eventId: number, newOwnerId: string): Promise<Event>;
  updateEventBanner(id: number, bannerUrl: string | null): Promise<void>;
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
  getVendorProUsersInAreaOrHistory(areaCode: string, ownerEventIds: number[]): Promise<string[]>;
  getUsersForNotification(targetAudience: string, areaCode: string, ownerEventIds: number[], excludeUserId: string): Promise<string[]>;

  // Vendor Posts
  getVendorPosts(eventId: number): Promise<VendorPost[]>;
  getVendorPostForUser(eventId: number, vendorId: string): Promise<VendorPost | undefined>;
  createVendorPost(post: InsertVendorPost & { vendorId: string }): Promise<VendorPost>;
  deleteVendorPost(postId: number, vendorId?: string): Promise<void>;
  updateVendorPostImages(postId: number, vendorId: string, imageUrls: string[]): Promise<VendorPost>;

  // Messages
  getMessages(areaCode?: string): Promise<Message[]>;
  createMessage(message: InsertMessage & { senderId: string }): Promise<Message>;
  deleteMessage(id: number): Promise<void>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(data: { userId: string; fromUserId?: string; type: string; title: string; message: string; eventId?: number }): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;

  // Event Maps
  getEventMap(eventId: number): Promise<EventMap | undefined>;
  upsertEventMap(eventId: number, mapData: any): Promise<EventMap>;

  // Vendor Registrations
  getVendorRegistrations(eventId: number): Promise<VendorRegistration[]>;
  getVendorRegistrationForUser(eventId: number, vendorId: string): Promise<VendorRegistration | undefined>;
  getUserRegistrations(userId: string): Promise<VendorRegistration[]>;
  createVendorRegistration(data: Omit<VendorRegistration, 'id' | 'createdAt'>): Promise<VendorRegistration>;
  updateRegistrationStatus(id: number, status: string, paymentIntentId?: string): Promise<void>;
  getAllRegistrations(): Promise<VendorRegistration[]>;
  cancelVendorRegistration(eventId: number, vendorId: string): Promise<void>;

  // Terms
  acceptTerms(userId: string, tier: string): Promise<void>;
  hasAcceptedTerms(userId: string, tier: string): Promise<boolean>;

  // Admin Settings
  getAdminSettings(): Promise<AdminSetting[]>;
  getAdminSetting(key: string): Promise<string | undefined>;
  upsertAdminSetting(key: string, value: string): Promise<void>;

  // Admin Stats
  getAdminStats(): Promise<any>;
  recordAnonymousClick(eventId: number, sessionId: string): Promise<void>;
  getAnonymousClickStats(): Promise<any>;

  // Profile Views
  recordProfileView(profileUserId: string, viewerUserId?: string): Promise<void>;
  getProfileViewCount(profileUserId: string): Promise<number>;

  // Vendor Inventory
  getVendorInventory(vendorId: string, eventId?: number): Promise<VendorInventoryItem[]>;
  getVendorInventoryByNameAndEvent(vendorId: string, eventId: number, itemName: string): Promise<VendorInventoryItem | undefined>;
  createVendorInventoryItem(vendorId: string, data: InsertVendorInventory): Promise<VendorInventoryItem>;
  updateVendorInventoryItem(id: number, data: Partial<InsertVendorInventory>): Promise<VendorInventoryItem>;
  deleteVendorInventoryItem(id: number): Promise<void>;
  getVendorAnalytics(vendorId: string): Promise<any>;

  // Vendor Catalog
  getVendorCatalog(vendorId: string): Promise<(VendorCatalogItem & { assignments: VendorCatalogAssignment[] })[]>;
  getCatalogItem(id: number): Promise<VendorCatalogItem | undefined>;
  createVendorCatalogItem(vendorId: string, data: InsertVendorCatalog): Promise<VendorCatalogItem>;
  updateVendorCatalogItem(id: number, data: Partial<InsertVendorCatalog>): Promise<VendorCatalogItem>;
  deleteVendorCatalogItem(id: number): Promise<void>;
  assignCatalogItemToEvent(catalogItemId: number, eventId: number, vendorId: string, quantityAssigned: number): Promise<VendorCatalogAssignment>;
  removeCatalogItemFromEvent(catalogItemId: number, eventId: number): Promise<void>;
  getCatalogAssignmentsForEvent(eventId: number, vendorId: string): Promise<(VendorCatalogAssignment & { item: VendorCatalogItem })[]>;

  // Roadmap
  getRoadmapItems(): Promise<RoadmapItem[]>;
  createRoadmapItem(createdBy: string, data: InsertRoadmapItem): Promise<RoadmapItem>;
  updateRoadmapItem(id: number, data: Partial<InsertRoadmapItem>): Promise<RoadmapItem>;
  deleteRoadmapItem(id: number): Promise<void>;

  // Promo Codes
  getAllPromoCodes(): Promise<any[]>;
  createPromoCode(createdBy: string, data: any): Promise<any>;
  deactivatePromoCode(id: number): Promise<void>;
  validatePromoCode(code: string, tier: string): Promise<{ valid: boolean; promoCode?: any; error?: string }>;
  redeemPromoCode(code: string, userId: string, tier: string): Promise<any>;
  revokePromoCodeAccess(promoCodeId: number): Promise<void>;

  // Event Vendor Entries (owner-added)
  getEventVendorEntries(eventId: number): Promise<EventVendorEntry[]>;
  createEventVendorEntry(data: { eventId: number; addedBy: string; name: string; description?: string; email?: string; verificationCode?: string; matchedUserId?: string }): Promise<EventVendorEntry>;
  deleteEventVendorEntry(id: number): Promise<void>;
  getUserByEmail(email: string): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string | null } | undefined>;
  searchProUsers(query: string): Promise<{ id: string; name: string; businessName: string | null; zip: string | null }[]>;
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

  async completeOnboarding(userId: string): Promise<void> {
    await db
      .insert(userProfiles)
      .values({ userId, onboardingComplete: true })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { onboardingComplete: true, updatedAt: new Date() } });
  }

  // ---- Events ----
  async getEvents(areaCode?: string): Promise<Event[]> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const notExpired = or(isNull(events.canceledAt), gte(events.canceledAt, threeDaysAgo));
    if (areaCode) {
      return await db.select().from(events).where(and(eq(events.areaCode, areaCode), notExpired!)).orderBy(desc(events.createdAt));
    }
    return await db.select().from(events).where(notExpired!).orderBy(desc(events.createdAt));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [e] = await db.select().from(events).where(eq(events.id, id));
    return e;
  }

  async getEventsByOwner(ownerId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.createdBy, ownerId)).orderBy(desc(events.createdAt));
  }

  async createEvent(event: InsertEvent & { createdBy: string }): Promise<Event> {
    const [e] = await db.insert(events).values(event).returning();
    return e;
  }

  async deleteEvent(id: number): Promise<void> {
    await pool.query("DELETE FROM vendor_catalog_assignments WHERE event_id = $1", [id]);
    // Preserve inventory history: snapshot event title/date, then null the FK
    await pool.query(
      `UPDATE vendor_inventory vi
       SET event_title = e.title,
           event_date  = e.date,
           event_id    = NULL
       FROM events e
       WHERE vi.event_id = $1 AND e.id = $1`,
      [id]
    );
    await pool.query("DELETE FROM vendor_registrations WHERE event_id = $1", [id]);
    await pool.query("DELETE FROM vendor_posts WHERE event_id = $1", [id]);
    await pool.query("DELETE FROM event_attendance WHERE event_id = $1", [id]);
    await pool.query("DELETE FROM event_maps WHERE event_id = $1", [id]);
    await pool.query("DELETE FROM event_dates WHERE event_id = $1", [id]);
    await pool.query("DELETE FROM notifications WHERE event_id = $1", [id]);
    await pool.query("DELETE FROM events WHERE id = $1", [id]);
  }

  async cancelEvent(id: number): Promise<void> {
    await db.update(events).set({ canceledAt: new Date() }).where(eq(events.id, id));
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }

  async transferEventOwnership(eventId: number, newOwnerId: string): Promise<Event> {
    const [updated] = await db.update(events).set({ createdBy: newOwnerId }).where(eq(events.id, eventId)).returning();
    return updated;
  }

  async updateEventBanner(id: number, bannerUrl: string | null): Promise<void> {
    await db.update(events).set({ bannerUrl }).where(eq(events.id, id));
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
    await pool.query("DELETE FROM event_dates WHERE event_id = $1", [eventId]);
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
    await pool.query("DELETE FROM event_attendance WHERE event_id = $1 AND user_id = $2", [eventId, userId]);
  }

  async getUserStatusForEvent(eventId: number, userId: string): Promise<string | null> {
    const [a] = await db.select().from(eventAttendance).where(
      and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.userId, userId))
    );
    return a?.status ?? null;
  }

  async getVendorProUsersInAreaOrHistory(areaCode: string, ownerEventIds: number[]): Promise<string[]> {
    // Get Vendor Pro users whose primary or additional area codes include the target
    const proUsersInArea = await db.select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(and(
        eq(userProfiles.subscriptionTier, 'vendor_pro'),
        eq(userProfiles.subscriptionStatus, 'active'),
        or(
          eq(userProfiles.areaCode, areaCode),
          sql`${areaCode} = ANY(${userProfiles.notificationAreaCodes})`
        )
      ));

    // Get Vendor Pro users who attended any of the owner's events in last 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    let historicUserIds: string[] = [];
    if (ownerEventIds.length > 0) {
      const historic = await db.select({ userId: eventAttendance.userId })
        .from(eventAttendance)
        .innerJoin(userProfiles, eq(eventAttendance.userId, userProfiles.userId))
        .where(and(
          inArray(eventAttendance.eventId, ownerEventIds),
          eq(userProfiles.subscriptionTier, 'vendor_pro'),
          gte(eventAttendance.createdAt, threeYearsAgo)
        ));
      historicUserIds = historic.map(h => h.userId);
    }

    const areaUserIds = proUsersInArea.map(u => u.userId);
    return Array.from(new Set([...areaUserIds, ...historicUserIds]));
  }

  async getUsersForNotification(targetAudience: string, areaCode: string, ownerEventIds: number[], excludeUserId: string): Promise<string[]> {
    let profiles: { userId: string }[] = [];

    if (targetAudience === 'vendor_pro') {
      // Vendor Pro in area (primary or additional notification area codes) + historic attendees
      const inArea = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(and(
          eq(userProfiles.subscriptionTier, 'vendor_pro'),
          eq(userProfiles.subscriptionStatus, 'active'),
          or(
            eq(userProfiles.areaCode, areaCode),
            sql`${areaCode} = ANY(${userProfiles.notificationAreaCodes})`
          )
        ));
      profiles = [...inArea];
      if (ownerEventIds.length > 0) {
        const historic = await db.select({ userId: eventAttendance.userId }).from(eventAttendance)
          .innerJoin(userProfiles, eq(eventAttendance.userId, userProfiles.userId))
          .where(and(inArray(eventAttendance.eventId, ownerEventIds), eq(userProfiles.subscriptionTier, 'vendor_pro')));
        profiles = [...profiles, ...historic];
      }
    } else if (targetAudience === 'general') {
      // Free/general users in area
      profiles = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(and(eq(userProfiles.subscriptionTier, 'free'), eq(userProfiles.areaCode, areaCode)));
    } else {
      // 'all' — everyone in area
      profiles = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(eq(userProfiles.areaCode, areaCode));
    }

    const ids = Array.from(new Set(profiles.map(p => p.userId))).filter(id => id !== excludeUserId);
    return ids;
  }

  // ---- Vendor Posts ----
  async getVendorPosts(eventId: number): Promise<VendorPost[]> {
    return await db.select().from(vendorPosts).where(eq(vendorPosts.eventId, eventId)).orderBy(desc(vendorPosts.createdAt));
  }

  async getVendorPostForUser(eventId: number, vendorId: string): Promise<VendorPost | undefined> {
    const [p] = await db.select().from(vendorPosts)
      .where(and(eq(vendorPosts.eventId, eventId), eq(vendorPosts.vendorId, vendorId)));
    return p;
  }

  async createVendorPost(post: InsertVendorPost & { vendorId: string }): Promise<VendorPost> {
    const [p] = await db.insert(vendorPosts).values(post).returning();
    return p;
  }

  async deleteVendorPost(postId: number, vendorId?: string): Promise<void> {
    if (vendorId) {
      await pool.query("DELETE FROM vendor_posts WHERE id = $1 AND vendor_id = $2", [postId, vendorId]);
    } else {
      await pool.query("DELETE FROM vendor_posts WHERE id = $1", [postId]);
    }
  }

  async updateVendorPostImages(postId: number, vendorId: string, imageUrls: string[]): Promise<VendorPost> {
    const [p] = await db.update(vendorPosts)
      .set({ imageUrls })
      .where(and(eq(vendorPosts.id, postId), eq(vendorPosts.vendorId, vendorId)))
      .returning();
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

  async deleteMessage(id: number): Promise<void> {
    await pool.query("DELETE FROM messages WHERE id = $1", [id]);
  }

  // ---- Notifications ----
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: { userId: string; fromUserId?: string; type: string; title: string; message: string; eventId?: number }): Promise<Notification> {
    const [n] = await db.insert(notifications).values(data).returning();
    return n;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db.update(notifications).set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result[0]?.count || 0);
  }

  // ---- Event Maps ----
  async getEventMap(eventId: number): Promise<EventMap | undefined> {
    const [m] = await db.select().from(eventMaps).where(eq(eventMaps.eventId, eventId));
    return m;
  }

  async upsertEventMap(eventId: number, mapData: any): Promise<EventMap> {
    const [m] = await db.insert(eventMaps)
      .values({ eventId, mapData })
      .onConflictDoUpdate({ target: eventMaps.eventId, set: { mapData, updatedAt: new Date() } })
      .returning();
    return m;
  }

  // ---- Vendor Registrations ----
  async getVendorRegistrations(eventId: number): Promise<VendorRegistration[]> {
    return await db.select().from(vendorRegistrations)
      .where(eq(vendorRegistrations.eventId, eventId))
      .orderBy(desc(vendorRegistrations.createdAt));
  }

  async getVendorRegistrationForUser(eventId: number, vendorId: string): Promise<VendorRegistration | undefined> {
    const [r] = await db.select().from(vendorRegistrations)
      .where(and(
        eq(vendorRegistrations.eventId, eventId),
        eq(vendorRegistrations.vendorId, vendorId),
        sql`status != 'canceled'`
      ));
    return r;
  }

  async getUserRegistrations(userId: string): Promise<VendorRegistration[]> {
    return await db.select().from(vendorRegistrations)
      .where(eq(vendorRegistrations.vendorId, userId))
      .orderBy(desc(vendorRegistrations.createdAt));
  }

  async createVendorRegistration(data: Omit<VendorRegistration, 'id' | 'createdAt'>): Promise<VendorRegistration> {
    const [r] = await db.insert(vendorRegistrations).values(data).returning();
    return r;
  }

  async updateRegistrationStatus(id: number, status: string, paymentIntentId?: string): Promise<void> {
    const update: any = { status };
    if (paymentIntentId) update.stripePaymentIntentId = paymentIntentId;
    await db.update(vendorRegistrations).set(update).where(eq(vendorRegistrations.id, id));
  }

  async getAllRegistrations(): Promise<VendorRegistration[]> {
    return await db.select().from(vendorRegistrations).orderBy(desc(vendorRegistrations.createdAt));
  }

  async cancelVendorRegistration(eventId: number, vendorId: string): Promise<void> {
    await db.update(vendorRegistrations)
      .set({ status: 'canceled' })
      .where(and(eq(vendorRegistrations.eventId, eventId), eq(vendorRegistrations.vendorId, vendorId)));
  }

  // ---- Terms ----
  async acceptTerms(userId: string, tier: string): Promise<void> {
    await db.insert(termsAcceptances).values({ userId, tier });
    await db.update(userProfiles).set({ termsAcceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
  }

  async hasAcceptedTerms(userId: string, tier: string): Promise<boolean> {
    const [t] = await db.select().from(termsAcceptances)
      .where(and(eq(termsAcceptances.userId, userId), eq(termsAcceptances.tier, tier)));
    return !!t;
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

  // ---- Admin Stats ----
  async getAdminStats(): Promise<any> {
    const allEvents = await db.select().from(events);
    const allProfiles = await db.select().from(userProfiles);
    const allRegistrations = await db.select().from(vendorRegistrations);

    // Events by area code
    const eventsByArea: Record<string, number> = {};
    for (const e of allEvents) {
      const key = e.areaCode || 'No area';
      eventsByArea[key] = (eventsByArea[key] || 0) + 1;
    }

    // Vendors by area code
    const vendorsByArea: Record<string, number> = {};
    for (const p of allProfiles.filter(p => p.profileType === 'vendor' || p.profileType === 'event_owner')) {
      const key = p.areaCode || 'No area';
      vendorsByArea[key] = (vendorsByArea[key] || 0) + 1;
    }

    // Pro tier counts (all active pro subscriptions grouped under vendor_pro)
    const tierCounts: Record<string, number> = { vendor_pro: 0, free: 0 };
    for (const p of allProfiles) {
      const tier = p.subscriptionTier || 'free';
      if (p.subscriptionStatus === 'active' && tier !== 'free') {
        tierCounts['vendor_pro'] = (tierCounts['vendor_pro'] || 0) + 1;
      } else {
        tierCounts['free'] = (tierCounts['free'] || 0) + 1;
      }
    }

    // Revenue estimate from registrations
    const totalRevenueCents = allRegistrations
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.feeCents || 0), 0);

    // Monthly revenue estimate from pro subscriptions ($14.95/mo each)
    const proRevenue = tierCounts['vendor_pro'] * 1495;

    return {
      totalEvents: allEvents.length,
      eventsByArea,
      vendorsByArea,
      totalUsers: allProfiles.length,
      totalGeneralUsers: allProfiles.filter(p => p.profileType === 'general').length,
      totalVendors: allProfiles.filter(p => p.profileType === 'vendor').length,
      totalEventOwners: allProfiles.filter(p => p.profileType === 'event_owner').length,
      tierCounts,
      totalProAccounts: tierCounts['vendor_pro'],
      nonProAccounts: tierCounts['free'],
      totalRevenueCents,
      estimatedMonthlyProRevenueCents: proRevenue,
    };
  }

  async recordAnonymousClick(eventId: number, sessionId: string): Promise<void> {
    await db.insert(anonymousEventClicks).values({ eventId, sessionId });
  }

  async getAnonymousClickStats(): Promise<any> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(anonymousEventClicks);
    const [{ todayTotal }] = await db.select({ todayTotal: sql<number>`count(*)::int` }).from(anonymousEventClicks).where(gte(anonymousEventClicks.createdAt, todayStart));
    const [{ weekTotal }] = await db.select({ weekTotal: sql<number>`count(*)::int` }).from(anonymousEventClicks).where(gte(anonymousEventClicks.createdAt, weekStart));
    const [{ uniqueSessions }] = await db.select({ uniqueSessions: sql<number>`count(distinct session_id)::int` }).from(anonymousEventClicks);

    const topEventsRaw = await pool.query(`
      SELECT ac.event_id, e.title, count(*)::int as clicks, count(distinct ac.session_id)::int as unique_sessions
      FROM anonymous_event_clicks ac
      LEFT JOIN events e ON e.id = ac.event_id
      GROUP BY ac.event_id, e.title
      ORDER BY clicks DESC
      LIMIT 10
    `);

    return {
      total,
      todayTotal,
      weekTotal,
      uniqueSessions,
      topEvents: topEventsRaw.rows,
    };
  }

  // ---- Profile Views ----
  async recordProfileView(profileUserId: string, viewerUserId?: string): Promise<void> {
    if (viewerUserId === profileUserId) return;
    await db.insert(profileViews).values({ profileUserId, viewerUserId });
  }

  async getProfileViewCount(profileUserId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileViews)
      .where(eq(profileViews.profileUserId, profileUserId));
    return row?.count ?? 0;
  }

  // ---- Vendor Inventory ----
  async getVendorInventory(vendorId: string, eventId?: number): Promise<VendorInventoryItem[]> {
    if (eventId) {
      return await db.select().from(vendorInventory)
        .where(and(eq(vendorInventory.vendorId, vendorId), eq(vendorInventory.eventId, eventId)))
        .orderBy(desc(vendorInventory.createdAt));
    }
    return await db.select().from(vendorInventory)
      .where(eq(vendorInventory.vendorId, vendorId))
      .orderBy(desc(vendorInventory.createdAt));
  }

  async getVendorInventoryByNameAndEvent(vendorId: string, eventId: number, itemName: string): Promise<VendorInventoryItem | undefined> {
    const [item] = await db.select().from(vendorInventory)
      .where(and(
        eq(vendorInventory.vendorId, vendorId),
        eq(vendorInventory.eventId, eventId),
        eq(vendorInventory.itemName, itemName)
      ));
    return item;
  }

  async createVendorInventoryItem(vendorId: string, data: InsertVendorInventory): Promise<VendorInventoryItem> {
    const [item] = await db.insert(vendorInventory).values({ vendorId, ...data }).returning();
    return item;
  }

  async updateVendorInventoryItem(id: number, data: Partial<InsertVendorInventory>): Promise<VendorInventoryItem> {
    const [item] = await db.update(vendorInventory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendorInventory.id, id))
      .returning();
    return item;
  }

  async deleteVendorInventoryItem(id: number): Promise<void> {
    await pool.query("DELETE FROM vendor_inventory WHERE id = $1", [id]);
  }

  async getVendorAnalytics(vendorId: string): Promise<any> {
    const attendance = await db.select().from(eventAttendance)
      .where(and(eq(eventAttendance.userId, vendorId), eq(eventAttendance.status, 'attending')));

    const posts = await db.select({ eventId: vendorPosts.eventId })
      .from(vendorPosts)
      .where(eq(vendorPosts.vendorId, vendorId));

    const attendanceEventIds = attendance.map(a => a.eventId);
    const postEventIds = posts.map(p => p.eventId);
    const allEventIds = Array.from(new Set([...attendanceEventIds, ...postEventIds]));

    const attendedEvents = allEventIds.length > 0
      ? await db.select().from(events).where(inArray(events.id, allEventIds))
      : [];

    const profileViewCount = await this.getProfileViewCount(vendorId);

    const allInventory = await this.getVendorInventory(vendorId);

    const inventoryByEvent: Record<number, VendorInventoryItem[]> = {};
    for (const item of allInventory) {
      if (!inventoryByEvent[item.eventId]) inventoryByEvent[item.eventId] = [];
      inventoryByEvent[item.eventId].push(item);
    }

    const itemSummary: Record<string, { totalSold: number; totalRevenueCents: number; events: string[] }> = {};
    for (const item of allInventory) {
      if (!itemSummary[item.itemName]) {
        itemSummary[item.itemName] = { totalSold: 0, totalRevenueCents: 0, events: [] };
      }
      itemSummary[item.itemName].totalSold += item.quantitySold;
      itemSummary[item.itemName].totalRevenueCents += item.quantitySold * item.priceCents;
      const ev = attendedEvents.find(e => e.id === item.eventId);
      if (ev && !itemSummary[item.itemName].events.includes(ev.title)) {
        itemSummary[item.itemName].events.push(ev.title);
      }
    }

    return {
      attendedEvents,
      profileViewCount,
      inventoryByEvent,
      itemSummary,
    };
  }

  // ---- Vendor Catalog ----
  async getVendorCatalog(vendorId: string): Promise<(VendorCatalogItem & { assignments: VendorCatalogAssignment[] })[]> {
    const items = await db.select().from(vendorCatalog)
      .where(eq(vendorCatalog.vendorId, vendorId))
      .orderBy(desc(vendorCatalog.createdAt));
    const assignments = await db.select().from(vendorCatalogAssignments)
      .where(eq(vendorCatalogAssignments.vendorId, vendorId));
    return items.map(item => ({
      ...item,
      assignments: assignments.filter(a => a.catalogItemId === item.id),
    }));
  }

  async getCatalogItem(id: number): Promise<VendorCatalogItem | undefined> {
    const [item] = await db.select().from(vendorCatalog).where(eq(vendorCatalog.id, id));
    return item;
  }

  async createVendorCatalogItem(vendorId: string, data: InsertVendorCatalog): Promise<VendorCatalogItem> {
    const [item] = await db.insert(vendorCatalog).values({ vendorId, ...data }).returning();
    return item;
  }

  async updateVendorCatalogItem(id: number, data: Partial<InsertVendorCatalog>): Promise<VendorCatalogItem> {
    const [item] = await db.update(vendorCatalog)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendorCatalog.id, id))
      .returning();
    return item;
  }

  async deleteVendorCatalogItem(id: number): Promise<void> {
    await pool.query("DELETE FROM vendor_catalog_assignments WHERE catalog_item_id = $1", [id]);
    await pool.query("DELETE FROM vendor_catalog WHERE id = $1", [id]);
  }

  async assignCatalogItemToEvent(catalogItemId: number, eventId: number, vendorId: string, quantityAssigned: number): Promise<VendorCatalogAssignment> {
    const existing = await db.select().from(vendorCatalogAssignments)
      .where(and(eq(vendorCatalogAssignments.catalogItemId, catalogItemId), eq(vendorCatalogAssignments.eventId, eventId)));
    if (existing.length > 0) {
      const [updated] = await db.update(vendorCatalogAssignments)
        .set({ quantityAssigned })
        .where(and(eq(vendorCatalogAssignments.catalogItemId, catalogItemId), eq(vendorCatalogAssignments.eventId, eventId)))
        .returning();
      return updated;
    }
    const [assignment] = await db.insert(vendorCatalogAssignments)
      .values({ catalogItemId, eventId, vendorId, quantityAssigned })
      .returning();
    return assignment;
  }

  async removeCatalogItemFromEvent(catalogItemId: number, eventId: number): Promise<void> {
    await pool.query("DELETE FROM vendor_catalog_assignments WHERE catalog_item_id = $1 AND event_id = $2", [catalogItemId, eventId]);
  }

  async getCatalogAssignmentsForEvent(eventId: number, vendorId: string): Promise<(VendorCatalogAssignment & { item: VendorCatalogItem })[]> {
    const assignments = await db.select().from(vendorCatalogAssignments)
      .where(and(eq(vendorCatalogAssignments.eventId, eventId), eq(vendorCatalogAssignments.vendorId, vendorId)));
    if (assignments.length === 0) return [];
    const itemIds = assignments.map(a => a.catalogItemId);
    const items = await db.select().from(vendorCatalog).where(inArray(vendorCatalog.id, itemIds));
    return assignments.map(a => ({
      ...a,
      item: items.find(i => i.id === a.catalogItemId)!,
    }));
  }

  // ---- Roadmap ----
  async getRoadmapItems(): Promise<RoadmapItem[]> {
    return await db.select().from(roadmapItems).orderBy(roadmapItems.createdAt);
  }

  async createRoadmapItem(createdBy: string, data: InsertRoadmapItem): Promise<RoadmapItem> {
    const [item] = await db.insert(roadmapItems).values({ createdBy, ...data }).returning();
    return item;
  }

  async updateRoadmapItem(id: number, data: Partial<InsertRoadmapItem>): Promise<RoadmapItem> {
    const [item] = await db.update(roadmapItems).set({ ...data, updatedAt: new Date() }).where(eq(roadmapItems.id, id)).returning();
    return item;
  }

  async deleteRoadmapItem(id: number): Promise<void> {
    await pool.query("DELETE FROM roadmap_items WHERE id = $1", [id]);
  }

  // ---- Promo Codes ----
  async getAllPromoCodes(): Promise<any[]> {
    const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    const uses = await db.select().from(promoCodeUses);
    return codes.map(c => ({
      ...c,
      uses: uses.filter(u => u.promoCodeId === c.id),
    }));
  }

  async createPromoCode(createdBy: string, data: any): Promise<any> {
    const [code] = await db.insert(promoCodes).values({
      code: data.code.toUpperCase().trim(),
      type: data.type,
      discountPercent: data.discountPercent || null,
      applicableTier: data.applicableTier || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxUses: data.maxUses || null,
      createdBy,
    }).returning();
    return code;
  }

  async deactivatePromoCode(id: number): Promise<void> {
    await db.update(promoCodes).set({ isActive: false }).where(eq(promoCodes.id, id));
  }

  async validatePromoCode(code: string, tier: string): Promise<{ valid: boolean; promoCode?: any; error?: string }> {
    const [pc] = await db.select().from(promoCodes)
      .where(and(eq(promoCodes.code, code.toUpperCase().trim()), eq(promoCodes.isActive, true)));
    if (!pc) return { valid: false, error: "Invalid or inactive promo code." };
    if (pc.expiresAt && pc.expiresAt < new Date()) return { valid: false, error: "This promo code has expired." };
    if (pc.maxUses !== null && pc.usesCount >= pc.maxUses) return { valid: false, error: "This promo code has reached its maximum uses." };
    if (pc.applicableTier && pc.applicableTier !== tier && pc.type === 'discount') return { valid: false, error: `This code is only valid for ${pc.applicableTier.replace(/_/g, ' ')}.` };
    return { valid: true, promoCode: pc };
  }

  async redeemPromoCode(code: string, userId: string, tier: string): Promise<any> {
    const [pc] = await db.select().from(promoCodes)
      .where(and(eq(promoCodes.code, code.toUpperCase().trim()), eq(promoCodes.isActive, true)));
    if (!pc) throw new Error("Invalid promo code.");
    await db.update(promoCodes).set({ usesCount: pc.usesCount + 1 }).where(eq(promoCodes.id, pc.id));
    await db.insert(promoCodeUses).values({ promoCodeId: pc.id, userId, tier });
    return pc;
  }

  async revokePromoCodeAccess(promoCodeId: number): Promise<void> {
    const uses = await db.select().from(promoCodeUses).where(eq(promoCodeUses.promoCodeId, promoCodeId));
    const userIds = Array.from(new Set(uses.map(u => u.userId)));
    for (const uid of userIds) {
      await db.update(userProfiles).set({ isAdmin: false }).where(eq(userProfiles.userId, uid));
    }
    await db.update(promoCodes).set({ isActive: false }).where(eq(promoCodes.id, promoCodeId));
  }

  // ---- Event Vendor Entries ----
  async getEventVendorEntries(eventId: number): Promise<EventVendorEntry[]> {
    return await db.select().from(eventVendorEntries)
      .where(eq(eventVendorEntries.eventId, eventId))
      .orderBy(desc(eventVendorEntries.createdAt));
  }

  async createEventVendorEntry(data: { eventId: number; addedBy: string; name: string; description?: string; email?: string; verificationCode?: string; matchedUserId?: string }): Promise<EventVendorEntry> {
    const [entry] = await db.insert(eventVendorEntries).values(data).returning();
    return entry;
  }

  async deleteEventVendorEntry(id: number): Promise<void> {
    await pool.query("DELETE FROM event_vendor_entries WHERE id = $1", [id]);
  }

  async getUserByEmail(email: string): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string | null } | undefined> {
    const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    return u;
  }

  async searchProUsers(query: string): Promise<{ id: string; name: string; businessName: string | null; zip: string | null }[]> {
    const q = `%${query.toLowerCase()}%`;
    const result = await pool.query<{ id: string; name: string; business_name: string | null; zip: string | null }>(`
      SELECT u.id,
             TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS name,
             p.business_name,
             p.area_code AS zip
      FROM users u
      JOIN user_profiles p ON p.user_id = u.id
      WHERE (
        (p.subscription_status = 'active' AND p.subscription_tier IN ('vendor_pro', 'event_owner_pro'))
        OR p.is_admin = true
      )
      AND (
        LOWER(COALESCE(p.business_name, '')) LIKE $1
        OR LOWER(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))) LIKE $1
      )
      ORDER BY p.business_name NULLS LAST, u.first_name
      LIMIT 10
    `, [q]);
    return result.rows.map(r => ({ id: r.id, name: r.name, businessName: r.business_name, zip: r.zip }));
  }
}

export const storage = new DatabaseStorage();
