import { db } from "./db";
import { eq, desc, and, inArray, sql, gte, or, isNull, lt } from "drizzle-orm";
import {
  events, vendorPosts, messages, eventDates, eventAttendance, userProfiles, adminSettings,
  notifications, eventMaps, vendorRegistrations, termsAcceptances, profileViews, vendorInventory,
  vendorCatalog, vendorCatalogAssignments, roadmapItems,
  promoCodes, promoCodeUses,
  type Event, type InsertEvent, type VendorPost, type InsertVendorPost,
  type Message, type InsertMessage, type EventDate, type EventAttendance,
  type UserProfile, type InsertUserProfile, type AdminSetting,
  type Notification, type EventMap, type VendorRegistration,
  type VendorInventoryItem, type InsertVendorInventory,
  type RoadmapItem, type InsertRoadmapItem,
  type VendorCatalogItem, type InsertVendorCatalog, type VendorCatalogAssignment,
} from "@shared/schema";

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
  createVendorPost(post: InsertVendorPost & { vendorId: string }): Promise<VendorPost>;
  deleteVendorPost(postId: number, vendorId?: string): Promise<void>;
  updateVendorPostImages(postId: number, vendorId: string, imageUrls: string[]): Promise<VendorPost>;

  // Messages
  getMessages(areaCode?: string): Promise<Message[]>;
  createMessage(message: InsertMessage & { senderId: string }): Promise<Message>;

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

  // Profile Views
  recordProfileView(profileUserId: string, viewerUserId?: string): Promise<void>;
  getProfileViewCount(profileUserId: string): Promise<number>;

  // Vendor Inventory
  getVendorInventory(vendorId: string, eventId?: number): Promise<VendorInventoryItem[]>;
  createVendorInventoryItem(vendorId: string, data: InsertVendorInventory): Promise<VendorInventoryItem>;
  updateVendorInventoryItem(id: number, data: Partial<InsertVendorInventory>): Promise<VendorInventoryItem>;
  deleteVendorInventoryItem(id: number): Promise<void>;
  getVendorAnalytics(vendorId: string): Promise<any>;

  // Vendor Catalog
  getVendorCatalog(vendorId: string): Promise<(VendorCatalogItem & { assignments: VendorCatalogAssignment[] })[]>;
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
    await db.delete(events).where(eq(events.id, id));
  }

  async cancelEvent(id: number): Promise<void> {
    await db.update(events).set({ canceledAt: new Date() }).where(eq(events.id, id));
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

  async getVendorProUsersInAreaOrHistory(areaCode: string, ownerEventIds: number[]): Promise<string[]> {
    // Get Vendor Pro users in the same area code
    const proUsersInArea = await db.select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(and(
        eq(userProfiles.subscriptionTier, 'vendor_pro'),
        eq(userProfiles.subscriptionStatus, 'active'),
        eq(userProfiles.areaCode, areaCode)
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
      // Vendor Pro in area + historic attendees
      const inArea = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(and(eq(userProfiles.subscriptionTier, 'vendor_pro'), eq(userProfiles.subscriptionStatus, 'active'), eq(userProfiles.areaCode, areaCode)));
      profiles = [...inArea];
      if (ownerEventIds.length > 0) {
        const historic = await db.select({ userId: eventAttendance.userId }).from(eventAttendance)
          .innerJoin(userProfiles, eq(eventAttendance.userId, userProfiles.userId))
          .where(and(inArray(eventAttendance.eventId, ownerEventIds), eq(userProfiles.subscriptionTier, 'vendor_pro')));
        profiles = [...profiles, ...historic];
      }
    } else if (targetAudience === 'event_owner_pro') {
      profiles = await db.select({ userId: userProfiles.userId }).from(userProfiles)
        .where(and(eq(userProfiles.subscriptionTier, 'event_owner_pro'), eq(userProfiles.subscriptionStatus, 'active'), eq(userProfiles.areaCode, areaCode)));
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

  async createVendorPost(post: InsertVendorPost & { vendorId: string }): Promise<VendorPost> {
    const [p] = await db.insert(vendorPosts).values(post).returning();
    return p;
  }

  async deleteVendorPost(postId: number, vendorId?: string): Promise<void> {
    if (vendorId) {
      await db.delete(vendorPosts).where(and(eq(vendorPosts.id, postId), eq(vendorPosts.vendorId, vendorId)));
    } else {
      await db.delete(vendorPosts).where(eq(vendorPosts.id, postId));
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

    // Pro tier counts
    const tierCounts: Record<string, number> = { event_owner_pro: 0, vendor_pro: 0, free: 0 };
    for (const p of allProfiles) {
      const tier = p.subscriptionTier || 'free';
      if (p.subscriptionStatus === 'active' && tier !== 'free') {
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      } else {
        tierCounts['free'] = (tierCounts['free'] || 0) + 1;
      }
    }

    // Revenue estimate from registrations
    const totalRevenueCents = allRegistrations
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.feeCents || 0), 0);

    // Monthly revenue estimate from pro subscriptions
    const proRevenue =
      tierCounts['event_owner_pro'] * 1995 +
      tierCounts['vendor_pro'] * 995;

    return {
      totalEvents: allEvents.length,
      eventsByArea,
      vendorsByArea,
      totalUsers: allProfiles.length,
      totalGeneralUsers: allProfiles.filter(p => p.profileType === 'general').length,
      totalVendors: allProfiles.filter(p => p.profileType === 'vendor').length,
      totalEventOwners: allProfiles.filter(p => p.profileType === 'event_owner').length,
      tierCounts,
      totalProAccounts: tierCounts['event_owner_pro'] + tierCounts['vendor_pro'],
      nonProAccounts: tierCounts['free'],
      totalRevenueCents,
      estimatedMonthlyProRevenueCents: proRevenue,
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
    await db.delete(vendorInventory).where(eq(vendorInventory.id, id));
  }

  async getVendorAnalytics(vendorId: string): Promise<any> {
    const attendance = await db.select().from(eventAttendance)
      .where(and(eq(eventAttendance.userId, vendorId), eq(eventAttendance.status, 'attending')));

    const eventIds = attendance.map(a => a.eventId);
    const attendedEvents = eventIds.length > 0
      ? await db.select().from(events).where(inArray(events.id, eventIds))
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
    await db.delete(vendorCatalogAssignments).where(eq(vendorCatalogAssignments.catalogItemId, id));
    await db.delete(vendorCatalog).where(eq(vendorCatalog.id, id));
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
    await db.delete(vendorCatalogAssignments)
      .where(and(eq(vendorCatalogAssignments.catalogItemId, catalogItemId), eq(vendorCatalogAssignments.eventId, eventId)));
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
    await db.delete(roadmapItems).where(eq(roadmapItems.id, id));
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
}

export const storage = new DatabaseStorage();
