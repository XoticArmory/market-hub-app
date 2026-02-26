import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, PRO_TIERS } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import Stripe from "stripe";

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
}

function getHost(req: any): string {
  return `${req.protocol}://${req.hostname}`;
}

async function isAdminUser(userId: string): Promise<boolean> {
  const profile = await storage.getUserProfile(userId);
  return profile?.isAdmin === true;
}

async function enrichUser(userId: string) {
  const u = await authStorage.getUser(userId);
  return {
    name: u?.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u?.email,
    avatar: u?.profileImageUrl,
    email: u?.email,
  };
}

function tierPriceKey(tier: string): string {
  return `stripe_price_${tier}`;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // ---- PROFILE ROUTES ----
  app.get(api.profile.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const user = await authStorage.getUser(userId);
    const attendance = await storage.getUserAttendance(userId);
    const unreadCount = await storage.getUnreadCount(userId);
    res.json({ profile, user, attendance, unreadCount });
  });

  app.get(api.profile.getById.path, async (req: any, res) => {
    const { userId } = req.params;
    const profile = await storage.getUserProfile(userId);
    const user = await authStorage.getUser(userId);
    if (!profile && !user) return res.status(404).json({ message: "Profile not found" });
    const attendance = await storage.getUserAttendance(userId);
    const viewerUserId = req.user?.claims?.sub;
    if (viewerUserId && viewerUserId !== userId) {
      storage.recordProfileView(userId, viewerUserId).catch(() => {});
    }
    res.json({ profile, user, attendance });
  });

  app.post(api.profile.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.profile.upsert.input.parse(req.body);
      const profile = await storage.upsertUserProfile(userId, input);
      res.json(profile);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });

  app.post(api.profile.completeOnboarding.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.completeOnboarding(userId);
    res.json({ success: true });
  });

  // ---- EVENT ROUTES ----
  app.get(api.events.list.path, async (req: any, res) => {
    const areaCode = req.query.areaCode as string | undefined;
    const allEvents = await storage.getEvents(areaCode);
    const enriched = await Promise.all(allEvents.map(async (e) => {
      const creator = await enrichUser(e.createdBy);
      const creatorProfile = await storage.getUserProfile(e.createdBy);
      const attendance = await storage.getEventAttendance(e.id);
      const extraDates = await storage.getEventDates(e.id);
      const attendingCount = attendance.filter(a => a.status === 'attending').length;
      const interestedCount = attendance.filter(a => a.status === 'interested').length;
      let userStatus: string | null = null;
      if (req.user) {
        userStatus = await storage.getUserStatusForEvent(e.id, req.user.claims?.sub);
      }
      const isFeatured = creatorProfile?.subscriptionTier === 'event_owner_pro' && creatorProfile?.subscriptionStatus === 'active';
      return { ...e, creatorName: creator.name, creatorTier: creatorProfile?.subscriptionTier, extraDates, attendingCount, interestedCount, userStatus, isFeatured };
    }));
    // Sort: featured (pro) events in the area at top, then by date
    enriched.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    });
    res.json(enriched);
  });

  app.get(api.events.get.path, async (req: any, res) => {
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const creator = await enrichUser(event.createdBy);
    const creatorProfile = await storage.getUserProfile(event.createdBy);
    const attendance = await storage.getEventAttendance(eventId);
    const extraDates = await storage.getEventDates(eventId);
    const attendingCount = attendance.filter(a => a.status === 'attending').length;
    const interestedCount = attendance.filter(a => a.status === 'interested').length;
    let userStatus: string | null = null;
    if (req.user) {
      userStatus = await storage.getUserStatusForEvent(eventId, req.user.claims?.sub);
    }
    const posts = await storage.getVendorPosts(eventId);
    const vendorAttendees = await Promise.all(posts.map(async (p) => {
      const u = await enrichUser(p.vendorId);
      return { ...p, vendorName: u.name, vendorAvatar: u.avatar };
    }));
    const registrations = await storage.getVendorRegistrations(eventId);
    const isFeatured = creatorProfile?.subscriptionTier === 'event_owner_pro' && creatorProfile?.subscriptionStatus === 'active';
    res.json({ ...event, creatorName: creator.name, creatorTier: creatorProfile?.subscriptionTier, extraDates, attendingCount, interestedCount, userStatus, vendorAttendees, registrations, isFeatured });
  });

  app.post(api.events.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.events.create.input.parse(req.body);
      const { extraDates, ...eventData } = input;
      const created = await storage.createEvent({ ...eventData, date: new Date(eventData.date as any), createdBy: userId });
      if (extraDates && extraDates.length > 0) {
        for (const d of extraDates) {
          await storage.createEventDate({ eventId: created.id, date: new Date(d) });
        }
      }
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message, field: e.errors[0].path.join('.') });
      throw e;
    }
  });

  app.delete(api.events.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const isAdmin = await isAdminUser(userId);
    if (event.createdBy !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteEvent(eventId);
    res.status(204).end();
  });

  // ---- ATTENDANCE ROUTES ----
  app.post(api.attendance.setStatus.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = Number(req.params.eventId);
      const { status } = api.attendance.setStatus.input.parse(req.body);
      const existing = await storage.getUserStatusForEvent(eventId, userId);
      const result = await storage.setAttendance(eventId, userId, status);
      if (status === 'attending') {
        const profile = await storage.getUserProfile(userId);
        if (profile?.profileType === 'vendor' && existing !== 'attending') {
          await storage.updateVendorSpacesUsed(eventId, 1);
        }
      }
      if (existing === 'attending' && status !== 'attending') {
        const profile = await storage.getUserProfile(userId);
        if (profile?.profileType === 'vendor') {
          await storage.updateVendorSpacesUsed(eventId, -1);
        }
      }
      res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });

  app.delete(api.attendance.removeStatus.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.eventId);
    const existing = await storage.getUserStatusForEvent(eventId, userId);
    if (existing === 'attending') {
      const profile = await storage.getUserProfile(userId);
      if (profile?.profileType === 'vendor') await storage.updateVendorSpacesUsed(eventId, -1);
    }
    await storage.removeAttendance(eventId, userId);
    res.status(204).end();
  });

  // ---- VENDOR POSTS ----
  app.get(api.vendorPosts.listByEvent.path, async (req, res) => {
    const eventId = Number(req.params.eventId);
    const posts = await storage.getVendorPosts(eventId);
    const enriched = await Promise.all(posts.map(async (p) => {
      const u = await enrichUser(p.vendorId);
      return { ...p, vendorName: u.name, vendorAvatar: u.avatar };
    }));
    res.json(enriched);
  });

  app.post(api.vendorPosts.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const input = api.vendorPosts.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const created = await storage.createVendorPost({ ...input, eventId, vendorId: userId });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });

  // ---- MESSAGES ----
  app.get(api.messages.list.path, async (req: any, res) => {
    const areaCode = req.query.areaCode as string | undefined;
    const msgs = await storage.getMessages(areaCode);
    const enriched = await Promise.all(msgs.map(async (m) => {
      const u = await enrichUser(m.senderId);
      return { ...m, senderName: u.name, senderAvatar: u.avatar };
    }));
    res.json(enriched.reverse());
  });

  app.post(api.messages.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const created = await storage.createMessage({ ...input, senderId: userId });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });

  // ---- NOTIFICATIONS ----
  app.get(api.notifications.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const notes = await storage.getNotifications(userId);
    res.json(notes);
  });

  app.get(api.notifications.unreadCount.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const count = await storage.getUnreadCount(userId);
    res.json({ count });
  });

  app.post(api.notifications.send.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (profile?.subscriptionTier !== 'event_owner_pro' || profile?.subscriptionStatus !== 'active') {
      return res.status(403).json({ message: "Event Owner Pro subscription required to send push notifications." });
    }
    const { title, message, eventId } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message required." });

    const ownerEvents = await storage.getEventsByOwner(userId);
    const ownerEventIds = ownerEvents.map(e => e.id);
    const areaCode = profile.areaCode || '';
    const targetUserIds = await storage.getVendorProUsersInAreaOrHistory(areaCode, ownerEventIds);

    const results = await Promise.all(
      targetUserIds.map(uid =>
        storage.createNotification({ userId: uid, fromUserId: userId, type: 'event', title, message, eventId })
      )
    );
    res.json({ sent: results.length });
  });

  app.patch(api.notifications.markRead.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    await storage.markNotificationRead(id, userId);
    res.json({ success: true });
  });

  app.post(api.notifications.markAllRead.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // ---- EVENT MAPS ----
  app.get(api.eventMap.get.path, async (req, res) => {
    const eventId = Number(req.params.id);
    const map = await storage.getEventMap(eventId);
    res.json(map || { eventId, mapData: { spots: [] } });
  });

  app.put(api.eventMap.save.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    if (event.createdBy !== userId && !profile?.isAdmin) {
      return res.status(403).json({ message: "Only the event owner can edit the map." });
    }
    if (profile?.subscriptionTier !== 'event_owner_pro' && !profile?.isAdmin) {
      return res.status(403).json({ message: "Event Owner Pro required to create event maps." });
    }
    const { mapData } = req.body;
    const saved = await storage.upsertEventMap(eventId, mapData);
    res.json(saved);
  });

  // ---- VENDOR REGISTRATIONS ----
  app.get(api.vendorRegistrations.listByEvent.path, async (req, res) => {
    const eventId = Number(req.params.eventId);
    const regs = await storage.getVendorRegistrations(eventId);
    const enriched = await Promise.all(regs.map(async r => {
      const u = await enrichUser(r.vendorId);
      return { ...r, vendorName: u.name, vendorAvatar: u.avatar };
    }));
    res.json(enriched);
  });

  app.post(api.vendorRegistrations.create.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.eventId);
    const { spotId, spotName } = req.body;
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    const isPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    const spotPriceCents = event.spotPrice || 0;
    const feeCents = isPro ? 0 : Math.round(spotPriceCents * 0.005);
    const reg = await storage.createVendorRegistration({
      eventId,
      vendorId: userId,
      spotId: spotId || null,
      spotName: spotName || null,
      amountCents: spotPriceCents,
      feeCents,
      isPro,
      status: spotPriceCents === 0 ? 'paid' : 'pending',
      stripePaymentIntentId: null,
    });

    if (spotPriceCents > 0) {
      const stripe = getStripe();
      if (stripe) {
        try {
          const totalCents = spotPriceCents + feeCents;
          const pi = await stripe.paymentIntents.create({
            amount: totalCents,
            currency: 'usd',
            metadata: { registrationId: reg.id.toString(), eventId: eventId.toString(), vendorId: userId },
          });
          await storage.updateRegistrationStatus(reg.id, 'pending', pi.id);
          return res.json({ ...reg, clientSecret: pi.client_secret, totalCents, feeCents });
        } catch (e: any) {
          return res.status(500).json({ message: e.message });
        }
      }
    }
    if (spotPriceCents === 0) {
      await storage.updateVendorSpacesUsed(eventId, 1);
    }
    res.json(reg);
  });

  // ---- PROFILE VIEW TRACKING ----
  app.post('/api/profile/:userId/view', isAuthenticated, async (req: any, res) => {
    const viewerUserId = req.user.claims.sub;
    const { userId } = req.params;
    await storage.recordProfileView(userId, viewerUserId);
    res.json({ ok: true });
  });

  app.get('/api/profile/:userId/views', isAuthenticated, async (req: any, res) => {
    const requesterId = req.user.claims.sub;
    const { userId } = req.params;
    const requesterProfile = await storage.getUserProfile(requesterId);
    if (userId !== requesterId && !requesterProfile?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const count = await storage.getProfileViewCount(userId);
    res.json({ count });
  });

  // ---- VENDOR ANALYTICS ----
  app.get('/api/vendor/analytics', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const analytics = await storage.getVendorAnalytics(userId);
    res.json(analytics);
  });

  // ---- VENDOR INVENTORY ----
  app.get('/api/vendor/inventory', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
    const items = await storage.getVendorInventory(userId, eventId);
    res.json(items);
  });

  app.post('/api/vendor/inventory', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const { eventId, itemName, quantityBrought, quantitySold, priceCents } = req.body;
    if (!eventId || !itemName) return res.status(400).json({ message: "eventId and itemName required" });
    const item = await storage.createVendorInventoryItem(userId, { eventId: Number(eventId), itemName, quantityBrought: Number(quantityBrought) || 0, quantitySold: Number(quantitySold) || 0, priceCents: Number(priceCents) || 0 });
    res.json(item);
  });

  app.patch('/api/vendor/inventory/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const id = Number(req.params.id);
    const { itemName, quantityBrought, quantitySold, priceCents } = req.body;
    const item = await storage.updateVendorInventoryItem(id, { itemName, quantityBrought, quantitySold, priceCents });
    res.json(item);
  });

  app.delete('/api/vendor/inventory/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    await storage.deleteVendorInventoryItem(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- ADMIN ROUTES ----
  app.get(api.admin.getSettings.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const settings = await storage.getAdminSettings();
    res.json(settings);
  });

  app.post(api.admin.upsertSetting.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { key, value } = api.admin.upsertSetting.input.parse(req.body);
    await storage.upsertAdminSetting(key, value);
    res.json({ key, value });
  });

  app.get(api.admin.getUsers.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const profiles = await storage.getAllUserProfiles();
    const enriched = await Promise.all(profiles.map(async (p) => {
      const user = await authStorage.getUser(p.userId);
      return { ...p, user };
    }));
    res.json(enriched);
  });

  app.post(api.admin.setUserAdmin.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { userId } = req.params;
    const { isAdmin } = req.body;
    await storage.setAdminFlag(userId, isAdmin);
    res.json({ success: true });
  });

  app.get(api.admin.getStats.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get(api.admin.getEvents.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const allEvents = await storage.getEvents();
    const enriched = await Promise.all(allEvents.map(async e => {
      const creator = await enrichUser(e.createdBy);
      const attendance = await storage.getEventAttendance(e.id);
      return { ...e, creatorName: creator.name, attendingCount: attendance.filter(a => a.status === 'attending').length };
    }));
    res.json(enriched);
  });

  app.delete(api.admin.deleteEvent.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const id = Number(req.params.id);
    await storage.deleteEvent(id);
    res.status(204).end();
  });

  app.get(api.admin.getRegistrations.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const regs = await storage.getAllRegistrations();
    const enriched = await Promise.all(regs.map(async r => {
      const u = await enrichUser(r.vendorId);
      const event = await storage.getEvent(r.eventId);
      return { ...r, vendorName: u.name, eventTitle: event?.title };
    }));
    res.json(enriched);
  });

  app.get(api.admin.getAnalytics.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { userId } = req.params;
    const ownerEvents = await storage.getEventsByOwner(userId);
    if (ownerEvents.length === 0) return res.json({ vendors: [], repeatVendors: [], avgAttending: 0, avgInterested: 0 });
    const vendorCounts: Record<string, { count: number; name: string }> = {};
    let totalAttending = 0, totalInterested = 0;
    for (const event of ownerEvents) {
      const posts = await storage.getVendorPosts(event.id);
      const attendance = await storage.getEventAttendance(event.id);
      totalAttending += attendance.filter(a => a.status === 'attending').length;
      totalInterested += attendance.filter(a => a.status === 'interested').length;
      for (const p of posts) {
        if (!vendorCounts[p.vendorId]) {
          const u = await enrichUser(p.vendorId);
          vendorCounts[p.vendorId] = { count: 0, name: u.name || 'Unknown' };
        }
        vendorCounts[p.vendorId].count++;
      }
    }
    const vendors = Object.entries(vendorCounts).map(([id, v]) => ({ id, name: v.name, eventCount: v.count }));
    const repeatVendors = vendors.filter(v => v.eventCount >= 2);
    res.json({
      vendors,
      repeatVendors,
      totalEvents: ownerEvents.length,
      avgAttending: ownerEvents.length ? Math.round(totalAttending / ownerEvents.length * 10) / 10 : 0,
      avgInterested: ownerEvents.length ? Math.round(totalInterested / ownerEvents.length * 10) / 10 : 0,
    });
  });

  // Claim admin via ADMIN_EMAILS env var
  app.post('/api/admin/claim', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await authStorage.getUser(userId);
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    if (!user?.email || !adminEmails.includes(user.email.toLowerCase())) {
      return res.status(403).json({ message: "Not authorized as admin." });
    }
    await storage.setAdminFlag(userId, true);
    res.json({ success: true });
  });

  // ---- STRIPE ROUTES ----
  app.get(api.stripe.subscriptionStatus.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    res.json({ status: profile?.subscriptionStatus || 'inactive', tier: profile?.subscriptionTier || 'free', subscriptionId: profile?.stripeSubscriptionId });
  });

  // Upgrade checkout for pro tiers
  app.post(api.stripe.upgradeCheckout.path, isAuthenticated, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured. Ask the admin to set up payments." });
    const { tier } = req.body;
    if (!tier || !['event_owner_pro', 'vendor_pro', 'general_pro'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier." });
    }
    const userId = req.user.claims.sub;
    const user = await authStorage.getUser(userId);
    const priceId = await storage.getAdminSetting(tierPriceKey(tier));
    if (!priceId) return res.status(503).json({ message: `Price not configured for ${tier}. Contact admin to set up ${tierPriceKey(tier)}.` });
    const profile = await storage.getUserProfile(userId);
    let customerId = profile?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user?.email || undefined, metadata: { userId } });
      customerId = customer.id;
      await storage.upsertUserProfile(userId, { stripeCustomerId: customerId });
    }
    // Accept terms before checkout
    await storage.acceptTerms(userId, tier);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${getHost(req)}/profile?subscribed=${tier}`,
      cancel_url: `${getHost(req)}/upgrade?canceled=1`,
      metadata: { userId, tier },
    });
    res.json({ url: session.url });
  });

  // Legacy checkout (kept for backward compat)
  app.post(api.stripe.createCheckout.path, isAuthenticated, async (req: any, res) => {
    return res.redirect(307, '/api/stripe/upgrade');
  });

  app.post(api.stripe.portalSession.path, isAuthenticated, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured." });
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!profile?.stripeCustomerId) return res.status(400).json({ message: "No billing account found." });
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${getHost(req)}/profile`,
    });
    res.json({ url: session.url });
  });

  app.post(api.stripe.acceptTerms.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { tier } = req.body;
    if (!tier) return res.status(400).json({ message: "Tier required." });
    await storage.acceptTerms(userId, tier);
    res.json({ success: true });
  });

  // Stripe webhook
  app.post('/api/stripe/webhook', async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).end();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      const sig = req.headers['stripe-signature'] as string;
      event = webhookSecret
        ? stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret)
        : JSON.parse(req.rawBody?.toString() || '{}');
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
    const getCustomerProfile = async (customerId: string) => {
      const profiles = await storage.getAllUserProfiles();
      return profiles.find(p => p.stripeCustomerId === customerId);
    };
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const tier = session.metadata?.tier;
      const userId = session.metadata?.userId;
      if (tier && userId) {
        await storage.upsertUserProfile(userId, {
          subscriptionTier: tier as any,
          subscriptionStatus: 'active',
          stripeSubscriptionId: session.subscription as string,
        });
      }
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object as Stripe.Subscription;
      const profile = await getCustomerProfile(sub.customer as string);
      if (profile) {
        const status = sub.status === 'active' ? 'active' : 'inactive';
        await storage.upsertUserProfile(profile.userId, { stripeSubscriptionId: sub.id, subscriptionStatus: status });
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const profile = await getCustomerProfile(sub.customer as string);
      if (profile) {
        await storage.upsertUserProfile(profile.userId, { subscriptionStatus: 'canceled', subscriptionTier: 'free' });
      }
    }
    res.json({ received: true });
  });

  return httpServer;
}
