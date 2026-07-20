import { db, pool } from "./db";
import { eq, desc, and, inArray, sql, gte, or, isNull, lt } from "drizzle-orm";
import {
  events, vendorPosts, messages, eventDates, eventAttendance, userProfiles, adminSettings,
  notifications, eventMaps, vendorRegistrations, termsAcceptances, profileViews, vendorInventory,
  vendorCatalog, vendorCatalogAssignments, vendorInventorySales, roadmapItems,
  promoCodes, promoCodeUses, anonymousEventClicks, eventVendorEntries,
  vendorItemCogs, vendorEventOverhead, documents, userFiles,
  type Event, type InsertEvent, type VendorPost, type InsertVendorPost,
  type Message, type InsertMessage, type EventDate, type EventAttendance,
  type UserProfile, type InsertUserProfile, type AdminSetting,
  type Notification, type EventMap, type VendorRegistration,
  type VendorInventoryItem, type InsertVendorInventory,
  type RoadmapItem, type InsertRoadmapItem,
  type VendorCatalogItem, type InsertVendorCatalog, type VendorCatalogAssignment,
  type VendorInventorySale,
  type EventVendorEntry,
  type VendorItemCogs, type VendorEventOverhead,
  type Document, type InsertDocument,
  type UserFile, type InsertUserFile,
} from "@workspace/db";
import { users } from "@workspace/db";

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
  getBulkEventDates(eventIds: number[]): Promise<EventDate[]>;
  createEventDate(data: { eventId: number; date: Date }): Promise<EventDate>;
  deleteEventDates(eventId: number): Promise<void>;

  // Attendance
  getEventAttendance(eventId: number): Promise<EventAttendance[]>;
  getBulkEventAttendance(eventIds: number[]): Promise<EventAttendance[]>;
  getBulkUserProfiles(userIds: string[]): Promise<UserProfile[]>;
  getUserStatusForAllEvents(userId: string, eventIds: number[]): Promise<EventAttendance[]>;
  getUserAttendance(userId: string): Promise<EventAttendance[]>;
  setAttendance(eventId: number, userId: string, status: string): Promise<EventAttendance>;
  removeAttendance(eventId: number, userId: string): Promise<void>;
  getUserStatusForEvent(eventId: number, userId: string): Promise<string | null>;
  getVendorProUsersInAreaOrHistory(areaCode: string, ownerEventIds: number[]): Promise<string[]>;
  getUsersForNotification(targetAudience: string, targetAreaCodes: string[], ownerEventIds: number[], excludeUserId: string): Promise<string[]>;
  getUsersForNewEventNotification(areaCode: string, excludeUserId: string): Promise<{ userId: string; phoneNumber: string | null; newEventNotifyMethod: string | null }[]>;

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
  getVendorRegistrationById(id: number): Promise<VendorRegistration | undefined>;
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
  getAdminUserId(): Promise<string | null>;
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
  assignCatalogItemToEvent(catalogItemId: number, eventId: number, vendorId: string, quantityAssigned: number, afterMarketReport?: boolean): Promise<VendorCatalogAssignment>;
  removeCatalogItemFromEvent(catalogItemId: number, eventId: number): Promise<void>;
  getCatalogAssignmentsForEvent(eventId: number, vendorId: string): Promise<(VendorCatalogAssignment & { item: VendorCatalogItem })[]>;

  // Inventory Sales
  logInventorySale(vendorId: string, catalogItemId: number, eventId: number, quantitySold: number, forDate?: string): Promise<VendorInventorySale>;
  getInventorySales(vendorId: string, eventId?: number): Promise<(VendorInventorySale & { itemName: string })[]>;
  getEventInventorySummary(vendorId: string, eventId: number, forDate?: Date): Promise<{ catalogItemId: number; itemName: string; quantityAssigned: number; totalSold: number; priceCents: number; costCents: number; revenueCents: number; profitCents: number; afterMarketReport: boolean }[]>;
  updateEventItem(vendorId: string, catalogItemId: number, eventId: number, updates: { itemName?: string; priceCents?: number; quantityAssigned?: number; totalSold?: number }, forDate?: string): Promise<void>;
  getPendingAfterMarketReportAssignments(): Promise<{ vendorId: string; eventId: number }[]>;
  markAfterMarketReportGenerated(vendorId: string, eventId: number): Promise<void>;

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

  // COGS
  getEventsWithCatalogAssignments(vendorId: string): Promise<{ id: number; title: string; date: Date | null }[]>;
  getItemCogs(vendorId: string, catalogItemId: number): Promise<VendorItemCogs[]>;
  upsertItemCogs(vendorId: string, catalogItemId: number, category: string, amountCents: number): Promise<VendorItemCogs>;
  deleteItemCogs(vendorId: string, catalogItemId: number, category: string): Promise<void>;
  getEventOverhead(vendorId: string, eventId: number): Promise<VendorEventOverhead | undefined>;
  upsertEventOverhead(vendorId: string, eventId: number, data: { boothRentalCents: number; travelCents: number; lodgingCents: number }): Promise<VendorEventOverhead>;
  getCogsSummaryForEvent(vendorId: string, eventId: number, forDate?: Date): Promise<any>;
  getCatalogInventorySummary(vendorId: string): Promise<any>;
  getEventDaysEndingOn(date: Date): Promise<{ eventId: number; date: Date }[]>;
  hasExistingDayReport(userId: string, eventId: number, dateSlug: string): Promise<boolean>;
  deductSoldInventoryForDay(vendorId: string, eventId: number, forDate: Date): Promise<number>;

  // Documents
  getDocuments(): Promise<Document[]>;
  createDocument(data: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // User Files
  getUserFiles(userId: string): Promise<UserFile[]>;
  createUserFile(data: InsertUserFile): Promise<UserFile>;
  getUserFile(id: number, userId: string): Promise<UserFile | undefined>;
  deleteUserFile(id: number, userId: string): Promise<void>;

  // Market Reports
  getEventsEndingOn(date: Date): Promise<Event[]>;
  getProVendorsWithAssignmentsAtEvent(eventId: number): Promise<string[]>;
  hasExistingReport(userId: string, eventId: number): Promise<boolean>;
  deductSoldInventoryFromCatalog(vendorId: string, eventId: number): Promise<number>;
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
    const now = new Date();

    // UNION gets all event IDs with at least one active date in a single efficient pass
    // (avoids the correlated EXISTS subquery that scanned event_dates once per event row)
    const activeIdsResult = await pool.query<{ id: number }>(
      `SELECT id FROM events WHERE date >= $1
       UNION
       SELECT event_id AS id FROM event_dates WHERE date >= $1`,
      [now]
    );
    const activeIds = activeIdsResult.rows.map(r => r.id);
    if (activeIds.length === 0) return [];

    const notCanceled = or(isNull(events.canceledAt), gte(events.canceledAt, threeDaysAgo));
    const hasActiveDate = inArray(events.id, activeIds);
    const filters = and(notCanceled!, hasActiveDate);

    if (areaCode) {
      return await db.select().from(events).where(and(eq(events.areaCode, areaCode), filters!)).orderBy(desc(events.createdAt));
    }
    return await db.select().from(events).where(filters!).orderBy(desc(events.createdAt));
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

  async getBulkEventDates(eventIds: number[]): Promise<EventDate[]> {
    if (eventIds.length === 0) return [];
    return await db.select().from(eventDates).where(inArray(eventDates.eventId, eventIds)).orderBy(eventDates.date);
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

  async getBulkEventAttendance(eventIds: number[]): Promise<EventAttendance[]> {
    if (eventIds.length === 0) return [];
    return await db.select().from(eventAttendance).where(inArray(eventAttendance.eventId, eventIds));
  }

  async getBulkUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(userProfiles).where(inArray(userProfiles.userId, userIds));
  }

  async getUserStatusForAllEvents(userId: string, eventIds: number[]): Promise<EventAttendance[]> {
    if (eventIds.length === 0) return [];
    return await db.select().from(eventAttendance)
      .where(and(eq(eventAttendance.userId, userId), inArray(eventAttendance.eventId, eventIds)));
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

  async getUsersForNotification(targetAudience: string, targetAreaCodes: string[], ownerEventIds: number[], excludeUserId: string): Promise<string[]> {
    let profiles: { userId: string }[] = [];

    // Build area code filter — if no codes provided, no area filtering (reach everyone)
    const buildAreaFilter = () => {
      if (targetAreaCodes.length === 0) return undefined;
      return or(
        inArray(userProfiles.areaCode, targetAreaCodes),
        sql`${userProfiles.notificationAreaCodes} && ARRAY[${sql.join(targetAreaCodes.map(c => sql`${c}`), sql`, `)}]::text[]`
      );
    };

    if (targetAudience === 'vendor_pro') {
      const tierFilter = and(
        eq(userProfiles.subscriptionTier, 'vendor_pro'),
        eq(userProfiles.subscriptionStatus, 'active')
      );
      const areaFilter = buildAreaFilter();
      const inArea = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(areaFilter ? and(tierFilter, areaFilter) : tierFilter);
      profiles = [...inArea];
      if (ownerEventIds.length > 0) {
        const historic = await db.select({ userId: eventAttendance.userId }).from(eventAttendance)
          .innerJoin(userProfiles, eq(eventAttendance.userId, userProfiles.userId))
          .where(and(inArray(eventAttendance.eventId, ownerEventIds), eq(userProfiles.subscriptionTier, 'vendor_pro')));
        profiles = [...profiles, ...historic];
      }
    } else if (targetAudience === 'general') {
      const tierFilter = eq(userProfiles.subscriptionTier, 'free');
      const areaFilter = buildAreaFilter();
      profiles = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(areaFilter ? and(tierFilter, areaFilter) : tierFilter);
    } else {
      // 'all' — everyone, optionally filtered by area
      const areaFilter = buildAreaFilter();
      profiles = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(areaFilter ?? undefined);
    }

    const ids = Array.from(new Set(profiles.map(p => p.userId))).filter(id => id !== excludeUserId);
    return ids;
  }

  async getUsersForNewEventNotification(areaCode: string, excludeUserId: string): Promise<{ userId: string; phoneNumber: string | null; newEventNotifyMethod: string | null }[]> {
    const rows = await db.select({
      userId: userProfiles.userId,
      phoneNumber: userProfiles.phoneNumber,
      newEventNotifyMethod: userProfiles.newEventNotifyMethod,
    }).from(userProfiles).where(
      and(
        sql`${userProfiles.newEventNotifyMethod} IS NOT NULL`,
        sql`${userProfiles.newEventNotifyMethod} != 'none'`,
        or(
          eq(userProfiles.areaCode, areaCode),
          sql`${userProfiles.notificationAreaCodes} @> ARRAY[${areaCode}]::text[]`
        )
      )
    );
    return rows.filter(r => r.userId !== excludeUserId);
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

  async getVendorRegistrationById(id: number): Promise<VendorRegistration | undefined> {
    const [r] = await db.select().from(vendorRegistrations).where(eq(vendorRegistrations.id, id));
    return r;
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
  async getAdminUserId(): Promise<string | null> {
    const [row] = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(eq(userProfiles.isAdmin, true)).limit(1);
    return row?.userId ?? null;
  }

  async getAdminSettings(): Promise<AdminSetting[]> {
    return await db.select().from(adminSettings);
  }

  async getAdminSetting(key: string): Promise<string | undefined> {
    const [s] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    return s?.value;
  }

  async upsertAdminSetting(key: string, value: string): Promise<void> {
    await pool.query(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
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
    const result = await pool.query(`
      SELECT
        count(*)::int                                                                  AS total,
        count(*) FILTER (WHERE created_at >= CURRENT_DATE)::int                       AS today_total,
        count(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int          AS week_total,
        count(distinct session_id)::int                                                AS unique_sessions
      FROM anonymous_event_clicks
    `);

    const topEventsRaw = await pool.query(`
      SELECT ac.event_id, e.title, count(*)::int as clicks, count(distinct ac.session_id)::int as unique_sessions
      FROM anonymous_event_clicks ac
      LEFT JOIN events e ON e.id = ac.event_id
      GROUP BY ac.event_id, e.title
      ORDER BY clicks DESC
      LIMIT 10
    `);

    const row = result.rows[0] ?? {};
    return {
      total:          row.total          ?? 0,
      todayTotal:     row.today_total    ?? 0,
      weekTotal:      row.week_total     ?? 0,
      uniqueSessions: row.unique_sessions ?? 0,
      topEvents:      topEventsRaw.rows,
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
    const { itemName, quantity, priceCents, costCents, imageUrl, images, variations } = data as any;
    const result = await pool.query<VendorCatalogItem>(
      `INSERT INTO vendor_catalog
         (vendor_id, item_name, quantity, price_cents, cost_cents, image_url, images, variations)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::text[])
       RETURNING *`,
      [
        vendorId,
        itemName,
        Number(quantity) || 0,
        Number(priceCents) || 0,
        Number(costCents) || 0,
        imageUrl || null,
        Array.isArray(images) ? images : [],
        Array.isArray(variations) ? variations : [],
      ]
    );
    return result.rows[0];
  }

  async updateVendorCatalogItem(id: number, data: Partial<InsertVendorCatalog>): Promise<VendorCatalogItem> {
    const { itemName, quantity, priceCents, costCents, imageUrl, images, variations } = data as any;
    const result = await pool.query<VendorCatalogItem>(
      `UPDATE vendor_catalog SET
         item_name    = COALESCE($2, item_name),
         quantity     = COALESCE($3, quantity),
         price_cents  = COALESCE($4, price_cents),
         cost_cents   = COALESCE($5, cost_cents),
         image_url    = $6,
         images       = $7::text[],
         variations   = $8::text[],
         updated_at   = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        itemName,
        quantity !== undefined ? Number(quantity) : null,
        priceCents !== undefined ? Number(priceCents) : null,
        costCents !== undefined ? Number(costCents) : null,
        imageUrl !== undefined ? (imageUrl || null) : undefined,
        Array.isArray(images) ? images : [],
        Array.isArray(variations) ? variations : [],
      ]
    );
    return result.rows[0];
  }

  async deleteVendorCatalogItem(id: number): Promise<void> {
    await pool.query("DELETE FROM vendor_catalog_assignments WHERE catalog_item_id = $1", [id]);
    await pool.query("DELETE FROM vendor_catalog WHERE id = $1", [id]);
  }

  async assignCatalogItemToEvent(catalogItemId: number, eventId: number, vendorId: string, quantityAssigned: number, afterMarketReport?: boolean): Promise<VendorCatalogAssignment> {
    const existing = await db.select().from(vendorCatalogAssignments)
      .where(and(eq(vendorCatalogAssignments.catalogItemId, catalogItemId), eq(vendorCatalogAssignments.eventId, eventId)));
    const updateSet: any = { quantityAssigned };
    if (afterMarketReport !== undefined) updateSet.afterMarketReport = afterMarketReport;
    if (existing.length > 0) {
      const [updated] = await db.update(vendorCatalogAssignments)
        .set(updateSet)
        .where(and(eq(vendorCatalogAssignments.catalogItemId, catalogItemId), eq(vendorCatalogAssignments.eventId, eventId)))
        .returning();
      return updated;
    }
    const [assignment] = await db.insert(vendorCatalogAssignments)
      .values({ catalogItemId, eventId, vendorId, quantityAssigned, afterMarketReport: afterMarketReport ?? false })
      .returning();
    return assignment;
  }

  async updateEventItem(
    vendorId: string,
    catalogItemId: number,
    eventId: number,
    updates: { itemName?: string; priceCents?: number; quantityAssigned?: number; totalSold?: number },
    forDate?: string
  ): Promise<void> {
    // 1. Update catalog name / price
    if (updates.itemName !== undefined || updates.priceCents !== undefined) {
      const catalogUpdates: any = {};
      if (updates.itemName !== undefined) catalogUpdates.itemName = updates.itemName;
      if (updates.priceCents !== undefined) catalogUpdates.priceCents = updates.priceCents;
      await db.update(vendorCatalog)
        .set(catalogUpdates)
        .where(and(eq(vendorCatalog.id, catalogItemId), eq(vendorCatalog.vendorId, vendorId)));
    }

    // 2. Update quantity_assigned on the assignment row
    if (updates.quantityAssigned !== undefined) {
      await pool.query(
        `UPDATE vendor_catalog_assignments SET quantity_assigned = $1 WHERE catalog_item_id = $2 AND event_id = $3 AND vendor_id = $4`,
        [updates.quantityAssigned, catalogItemId, eventId, vendorId]
      );
    }

    // 3. Replace sold quantity: delete existing sales then insert a single aggregate row
    if (updates.totalSold !== undefined) {
      if (forDate) {
        await pool.query(
          `DELETE FROM vendor_inventory_sales WHERE vendor_id = $1 AND catalog_item_id = $2 AND event_id = $3 AND sold_at >= $4::date AND sold_at < ($4::date + INTERVAL '1 day')`,
          [vendorId, catalogItemId, eventId, forDate]
        );
      } else {
        await pool.query(
          `DELETE FROM vendor_inventory_sales WHERE vendor_id = $1 AND catalog_item_id = $2 AND event_id = $3`,
          [vendorId, catalogItemId, eventId]
        );
      }
      if (updates.totalSold > 0) {
        const soldAt = forDate ? `${forDate}T12:00:00` : new Date().toISOString();
        await pool.query(
          `INSERT INTO vendor_inventory_sales (vendor_id, catalog_item_id, event_id, quantity_sold, sold_at) VALUES ($1, $2, $3, $4, $5)`,
          [vendorId, catalogItemId, eventId, updates.totalSold, soldAt]
        );
      }
    }
  }

  async logInventorySale(vendorId: string, catalogItemId: number, eventId: number, quantitySold: number, forDate?: string): Promise<VendorInventorySale> {
    const soldAt = forDate ? new Date(`${forDate}T12:00:00`) : new Date();
    const [sale] = await db.insert(vendorInventorySales)
      .values({ vendorId, catalogItemId, eventId, quantitySold, soldAt })
      .returning();
    return sale;
  }

  async getInventorySales(vendorId: string, eventId?: number): Promise<(VendorInventorySale & { itemName: string })[]> {
    const rows = await pool.query<any>(`
      SELECT vis.*, vc.item_name AS "itemName"
      FROM vendor_inventory_sales vis
      JOIN vendor_catalog vc ON vc.id = vis.catalog_item_id
      WHERE vis.vendor_id = $1
      ${eventId ? 'AND vis.event_id = $2' : ''}
      ORDER BY vis.sold_at DESC
    `, eventId ? [vendorId, eventId] : [vendorId]);
    return rows.rows;
  }

  async getEventInventorySummary(vendorId: string, eventId: number, forDate?: Date): Promise<{ catalogItemId: number; itemName: string; quantityAssigned: number; totalSold: number; priceCents: number; costCents: number; revenueCents: number; profitCents: number; afterMarketReport: boolean }[]> {
    const dateFilter = forDate
      ? `AND vis.sold_at >= $3::date AND vis.sold_at < ($3::date + INTERVAL '1 day')`
      : "";
    const params: any[] = [vendorId, eventId, ...(forDate ? [forDate] : [])];
    const rows = await pool.query<any>(`
      SELECT
        vca.catalog_item_id AS "catalogItemId",
        vc.item_name AS "itemName",
        vca.quantity_assigned AS "quantityAssigned",
        COALESCE(SUM(vis.quantity_sold), 0)::int AS "totalSold",
        vc.price_cents AS "priceCents",
        COALESCE(vc.cost_cents, 0) AS "costCents",
        (COALESCE(SUM(vis.quantity_sold), 0) * vc.price_cents)::int AS "revenueCents",
        (COALESCE(SUM(vis.quantity_sold), 0) * (vc.price_cents - COALESCE(vc.cost_cents, 0)))::int AS "profitCents",
        vca.after_market_report AS "afterMarketReport"
      FROM vendor_catalog_assignments vca
      JOIN vendor_catalog vc ON vc.id = vca.catalog_item_id
      LEFT JOIN vendor_inventory_sales vis ON vis.catalog_item_id = vca.catalog_item_id
        AND vis.event_id = vca.event_id
        AND vis.vendor_id = vca.vendor_id
        ${dateFilter}
      WHERE vca.vendor_id = $1 AND vca.event_id = $2
      GROUP BY vca.catalog_item_id, vc.item_name, vca.quantity_assigned, vc.price_cents, vc.cost_cents, vca.after_market_report
    `, params);
    return rows.rows;
  }

  async getPendingAfterMarketReportAssignments(): Promise<{ vendorId: string; eventId: number }[]> {
    const rows = await pool.query<any>(`
      SELECT DISTINCT vca.vendor_id AS "vendorId", vca.event_id AS "eventId"
      FROM vendor_catalog_assignments vca
      JOIN events e ON e.id = vca.event_id
      WHERE vca.after_market_report = true
        AND vca.report_generated = false
        AND e.date < NOW()
        AND e.date >= NOW() - INTERVAL '25 hours'
    `);
    return rows.rows;
  }

  async markAfterMarketReportGenerated(vendorId: string, eventId: number): Promise<void> {
    await pool.query(
      `UPDATE vendor_catalog_assignments SET report_generated = true WHERE vendor_id = $1 AND event_id = $2`,
      [vendorId, eventId]
    );
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

  async getAllCatalogVendorsAtEvent(eventId: number): Promise<{ vendorId: string; assignments: (VendorCatalogAssignment & { item: VendorCatalogItem })[] }[]> {
    const vendorRows = await db
      .selectDistinct({ vendorId: vendorCatalogAssignments.vendorId })
      .from(vendorCatalogAssignments)
      .where(eq(vendorCatalogAssignments.eventId, eventId));
    return await Promise.all(
      vendorRows.map(async ({ vendorId }) => ({
        vendorId,
        assignments: await this.getCatalogAssignmentsForEvent(eventId, vendorId),
      }))
    );
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
      discountDurationMonths: data.discountDurationMonths || null,
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

  // ---- COGS ----
  async getEventsWithCatalogAssignments(vendorId: string): Promise<{ id: number; title: string; date: Date | null }[]> {
    const result = await pool.query<{ id: number; title: string; date: Date | null }>(`
      SELECT DISTINCT e.id, e.title, e.date
      FROM vendor_catalog_assignments vca
      JOIN events e ON e.id = vca.event_id
      WHERE vca.vendor_id = $1
      ORDER BY e.date DESC
    `, [vendorId]);
    return result.rows;
  }

  async getItemCogs(vendorId: string, catalogItemId: number): Promise<VendorItemCogs[]> {
    return await db.select().from(vendorItemCogs)
      .where(and(eq(vendorItemCogs.vendorId, vendorId), eq(vendorItemCogs.catalogItemId, catalogItemId)));
  }

  async upsertItemCogs(vendorId: string, catalogItemId: number, category: string, amountCents: number): Promise<VendorItemCogs> {
    const [row] = await db.insert(vendorItemCogs)
      .values({ vendorId, catalogItemId, category, amountCents })
      .onConflictDoUpdate({
        target: [vendorItemCogs.vendorId, vendorItemCogs.catalogItemId, vendorItemCogs.category],
        set: { amountCents, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async deleteItemCogs(vendorId: string, catalogItemId: number, category: string): Promise<void> {
    await pool.query(
      "DELETE FROM vendor_item_cogs WHERE vendor_id = $1 AND catalog_item_id = $2 AND category = $3",
      [vendorId, catalogItemId, category]
    );
  }

  async getEventOverhead(vendorId: string, eventId: number): Promise<VendorEventOverhead | undefined> {
    const [row] = await db.select().from(vendorEventOverhead)
      .where(and(eq(vendorEventOverhead.vendorId, vendorId), eq(vendorEventOverhead.eventId, eventId)));
    return row;
  }

  async upsertEventOverhead(vendorId: string, eventId: number, data: { boothRentalCents: number; travelCents: number; lodgingCents: number }): Promise<VendorEventOverhead> {
    const [row] = await db.insert(vendorEventOverhead)
      .values({ vendorId, eventId, ...data })
      .onConflictDoUpdate({
        target: [vendorEventOverhead.vendorId, vendorEventOverhead.eventId],
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async getCogsSummaryForEvent(vendorId: string, eventId: number, forDate?: Date): Promise<any> {
    // Get all catalog assignments for this vendor at this event
    const assignments = await db.select({
      catalogItemId: vendorCatalogAssignments.catalogItemId,
      quantityAssigned: vendorCatalogAssignments.quantityAssigned,
    }).from(vendorCatalogAssignments)
      .where(and(eq(vendorCatalogAssignments.eventId, eventId), eq(vendorCatalogAssignments.vendorId, vendorId)));

    const catalogItemIds = assignments.map(a => a.catalogItemId);

    // Get catalog items
    const catalogItems = catalogItemIds.length > 0
      ? await db.select().from(vendorCatalog).where(inArray(vendorCatalog.id, catalogItemIds))
      : [];

    // Get all COGS for these catalog items
    const allCogs = catalogItemIds.length > 0
      ? await db.select().from(vendorItemCogs)
          .where(and(eq(vendorItemCogs.vendorId, vendorId), inArray(vendorItemCogs.catalogItemId, catalogItemIds)))
      : [];

    // Get event overhead
    const overhead = await this.getEventOverhead(vendorId, eventId);

    // Get sold quantities from vendor_inventory_sales (primary source)
    // Fall back to legacy vendorInventory table if no sales rows exist for backwards compatibility
    let salesMap = new Map<number, number>();
    if (catalogItemIds.length > 0) {
      const dateClause = forDate
        ? `AND sold_at >= $4::date AND sold_at < ($4::date + INTERVAL '1 day')`
        : "";
      const params: any[] = forDate
        ? [vendorId, eventId, catalogItemIds, forDate]
        : [vendorId, eventId, catalogItemIds];
      const salesResult = await pool.query<{ catalog_item_id: number; quantity_sold: number }>(
        `SELECT catalog_item_id, COALESCE(SUM(quantity_sold), 0)::int AS quantity_sold
         FROM vendor_inventory_sales
         WHERE vendor_id = $1 AND event_id = $2 AND catalog_item_id = ANY($3::int[])
         ${dateClause}
         GROUP BY catalog_item_id`,
        params
      );
      for (const row of salesResult.rows) {
        salesMap.set(row.catalog_item_id, row.quantity_sold);
      }
    }

    // Legacy fallback: if no sales records exist at all for this event, read from vendorInventory
    const legacyInventory = salesMap.size === 0 && catalogItemIds.length > 0
      ? await db.select().from(vendorInventory)
          .where(and(eq(vendorInventory.vendorId, vendorId), eq(vendorInventory.eventId as any, eventId)))
      : [];

    const totalItemsAtEvent = assignments.reduce((sum, a) => sum + (a.quantityAssigned || 0), 0);
    const boothRentalTotal = overhead?.boothRentalCents ?? 0;
    const travelTotal = overhead?.travelCents ?? 0;
    const lodgingTotal = overhead?.lodgingCents ?? 0;
    const totalOverheadCents = boothRentalTotal + travelTotal + lodgingTotal;
    const overheadPerItemCents = totalItemsAtEvent > 0 ? totalOverheadCents / totalItemsAtEvent : 0;

    const items = catalogItems.map(item => {
      const assignment = assignments.find(a => a.catalogItemId === item.id);
      const itemCogs = allCogs.filter(c => c.catalogItemId === item.id);
      const legacyInv = legacyInventory.find((i: any) => i.itemName === item.itemName);
      const quantityAssigned = assignment?.quantityAssigned ?? 0;
      const quantitySold = salesMap.get(item.id) ?? legacyInv?.quantitySold ?? 0;
      const sellPriceCents = item.priceCents ?? 0;
      const directCogsCents = itemCogs.reduce((sum, c) => sum + (c.amountCents ?? 0), 0);
      const totalCogsPerItemCents = directCogsCents + overheadPerItemCents;
      const revenueCents = sellPriceCents * quantitySold;
      const grossProfitCents = revenueCents - directCogsCents * quantitySold;
      const netProfitCents = revenueCents - totalCogsPerItemCents * quantitySold;

      return {
        catalogItemId: item.id,
        itemName: item.itemName,
        quantityAssigned,
        quantitySold,
        sellPriceCents,
        cogs: itemCogs,
        directCogsCents,
        overheadPerItemCents: Math.round(overheadPerItemCents),
        totalCogsPerItemCents: Math.round(totalCogsPerItemCents),
        revenueCents,
        grossProfitCents: Math.round(grossProfitCents),
        netProfitCents: Math.round(netProfitCents),
      };
    });

    return {
      eventId,
      overhead: overhead ?? { boothRentalCents: 0, travelCents: 0, lodgingCents: 0 },
      totalItemsAtEvent,
      overheadPerItemCents: Math.round(overheadPerItemCents),
      items,
    };
  }

  async getCatalogInventorySummary(vendorId: string): Promise<any> {
    const catalogItems = await db.select().from(vendorCatalog)
      .where(eq(vendorCatalog.vendorId, vendorId))
      .orderBy(vendorCatalog.itemName);

    if (catalogItems.length === 0) return { items: [] };

    const catalogItemIds = catalogItems.map(i => i.id);

    const allCogs = await db.select().from(vendorItemCogs)
      .where(and(eq(vendorItemCogs.vendorId, vendorId), inArray(vendorItemCogs.catalogItemId, catalogItemIds)));

    const assignmentRows = await pool.query<{
      catalog_item_id: number;
      event_id: number;
      quantity_assigned: number;
      event_title: string;
    }>(`
      SELECT vca.catalog_item_id, vca.event_id, vca.quantity_assigned, e.title AS event_title
      FROM vendor_catalog_assignments vca
      JOIN events e ON e.id = vca.event_id
      WHERE vca.vendor_id = $1
    `, [vendorId]);

    const items = catalogItems.map(item => {
      const itemCogs = allCogs.filter(c => c.catalogItemId === item.id);
      const assignments = assignmentRows.rows
        .filter(a => a.catalog_item_id === item.id)
        .map(a => ({ eventId: a.event_id, eventTitle: a.event_title, quantityAssigned: a.quantity_assigned }));

      const totalAssigned = assignments.reduce((s, a) => s + (a.quantityAssigned || 0), 0);
      const sellPriceCents = item.priceCents ?? 0;
      const directCogsCents = itemCogs.reduce((s, c) => s + (c.amountCents ?? 0), 0);
      const marginCents = sellPriceCents - directCogsCents;

      return {
        catalogItemId: item.id,
        itemName: item.itemName,
        quantity: item.quantity ?? 0,
        sellPriceCents,
        totalAssigned,
        assignments,
        cogs: itemCogs,
        directCogsCents,
        marginCents,
      };
    });

    return { items };
  }

  // ---- Documents ----
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await pool.query("DELETE FROM documents WHERE id = $1", [id]);
  }

  // ---- User Files ----
  async getUserFiles(userId: string): Promise<UserFile[]> {
    return await db.select().from(userFiles).where(eq(userFiles.userId, userId)).orderBy(desc(userFiles.createdAt));
  }

  async createUserFile(data: InsertUserFile): Promise<UserFile> {
    const [file] = await db.insert(userFiles).values(data).returning();
    return file;
  }

  async getUserFile(id: number, userId: string): Promise<UserFile | undefined> {
    const [file] = await db.select().from(userFiles).where(and(eq(userFiles.id, id), eq(userFiles.userId, userId)));
    return file;
  }

  async deleteUserFile(id: number, userId: string): Promise<void> {
    await pool.query("DELETE FROM user_files WHERE id = $1 AND user_id = $2", [id, userId]);
  }

  // ---- Market Reports ----
  async getEventsEndingOn(date: Date): Promise<Event[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    // Effective end date = MAX(event_dates.date) when extra dates exist, else events.date
    return await db.select().from(events)
      .where(
        and(
          isNull(events.canceledAt),
          sql`COALESCE(
            (SELECT MAX(ed.date) FROM event_dates ed WHERE ed.event_id = ${events.id}),
            ${events.date}
          ) >= ${start}`,
          sql`COALESCE(
            (SELECT MAX(ed.date) FROM event_dates ed WHERE ed.event_id = ${events.id}),
            ${events.date}
          ) < ${end}`
        )
      );
  }

  async getProVendorsWithAssignmentsAtEvent(eventId: number): Promise<string[]> {
    const rows = await db
      .select({ vendorId: vendorCatalogAssignments.vendorId })
      .from(vendorCatalogAssignments)
      .innerJoin(userProfiles, eq(userProfiles.userId, vendorCatalogAssignments.vendorId))
      .where(
        and(
          eq(vendorCatalogAssignments.eventId, eventId),
          or(
            eq(userProfiles.isAdmin, true),
            and(
              inArray(userProfiles.subscriptionTier, ["vendor_pro", "event_owner_pro"]),
              eq(userProfiles.subscriptionStatus, "active")
            )
          )
        )
      );
    return [...new Set(rows.map(r => r.vendorId))];
  }

  async hasExistingReport(userId: string, eventId: number): Promise<boolean> {
    const storagePath = `user-files/${userId}/market-report-${eventId}.csv`;
    const [existing] = await db
      .select({ id: userFiles.id })
      .from(userFiles)
      .where(and(eq(userFiles.userId, userId), eq(userFiles.storagePath, storagePath)));
    return !!existing;
  }

  async deductSoldInventoryFromCatalog(vendorId: string, eventId: number): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `UPDATE vendor_catalog vc
       SET quantity = GREATEST(0, vc.quantity - sold.qty)
       FROM (
         SELECT catalog_item_id, SUM(quantity_sold)::int AS qty
         FROM vendor_inventory_sales
         WHERE vendor_id = $1 AND event_id = $2
         GROUP BY catalog_item_id
       ) AS sold
       WHERE vc.id = sold.catalog_item_id AND vc.vendor_id = $1
       RETURNING vc.id`,
      [vendorId, eventId]
    );
    return result.rowCount ?? 0;
  }

  // Deduct only that day's sales from catalog stock AND update assignment quantities
  // so the next event day starts fresh with remaining inventory.
  async deductSoldInventoryForDay(vendorId: string, eventId: number, forDate: Date): Promise<number> {
    const catalogResult = await pool.query<{ id: number }>(
      `UPDATE vendor_catalog vc
       SET quantity = GREATEST(0, vc.quantity - sold.qty)
       FROM (
         SELECT catalog_item_id, SUM(quantity_sold)::int AS qty
         FROM vendor_inventory_sales
         WHERE vendor_id = $1 AND event_id = $2
           AND sold_at >= $3::date AND sold_at < ($3::date + INTERVAL '1 day')
         GROUP BY catalog_item_id
       ) AS sold
       WHERE vc.id = sold.catalog_item_id AND vc.vendor_id = $1
       RETURNING vc.id`,
      [vendorId, eventId, forDate]
    );

    // Update assignment quantities so the next day reflects remaining stock
    await pool.query(
      `UPDATE vendor_catalog_assignments vca
       SET quantity_assigned = GREATEST(0, vca.quantity_assigned - sold.qty)
       FROM (
         SELECT catalog_item_id, SUM(quantity_sold)::int AS qty
         FROM vendor_inventory_sales
         WHERE vendor_id = $1 AND event_id = $2
           AND sold_at >= $3::date AND sold_at < ($3::date + INTERVAL '1 day')
         GROUP BY catalog_item_id
       ) AS sold
       WHERE vca.catalog_item_id = sold.catalog_item_id
         AND vca.event_id = $2 AND vca.vendor_id = $1`,
      [vendorId, eventId, forDate]
    );

    return catalogResult.rowCount ?? 0;
  }

  // Returns all event days (main event date + additional event_dates) that fell on the given calendar date.
  async getEventDaysEndingOn(date: Date): Promise<{ eventId: number; date: Date }[]> {
    const result = await pool.query<{ event_id: number; day_date: Date }>(
      `SELECT e.id AS event_id, e.date AS day_date
       FROM events e
       WHERE e.canceled_at IS NULL
         AND e.date >= $1::date AND e.date < ($1::date + INTERVAL '1 day')
       UNION ALL
       SELECT ed.event_id, ed.date AS day_date
       FROM event_dates ed
       JOIN events e ON e.id = ed.event_id
       WHERE e.canceled_at IS NULL
         AND ed.date >= $1::date AND ed.date < ($1::date + INTERVAL '1 day')`,
      [date]
    );
    return result.rows.map(r => ({ eventId: r.event_id, date: new Date(r.day_date) }));
  }

  async hasExistingDayReport(userId: string, eventId: number, dateSlug: string): Promise<boolean> {
    const storagePath = `user-files/${userId}/market-report-${eventId}-${dateSlug}.csv`;
    const [existing] = await db
      .select({ id: userFiles.id })
      .from(userFiles)
      .where(and(eq(userFiles.userId, userId), eq(userFiles.storagePath, storagePath)));
    return !!existing;
  }
}

export const storage = new DatabaseStorage();
