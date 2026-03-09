import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, PRO_TIERS } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { SquareClient, SquareEnvironment } from "square";

function tierToProfileType(tier: string): string {
  if (tier === 'event_owner_pro') return 'event_owner';
  if (tier === 'vendor_pro') return 'vendor';
  return 'general';
}

function getSquare(): SquareClient | null {
  if (!process.env.SQUARE_ACCESS_TOKEN) return null;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const isSandbox = process.env.SQUARE_ENVIRONMENT === 'sandbox';
  return new SquareClient({
    token,
    environment: isSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  });
}

function squareJson(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));
}

async function getSquareLocationId(): Promise<string> {
  const stored = await storage.getAdminSetting('square_location_id');
  return stored || process.env.SQUARE_LOCATION_ID || '';
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
  return `square_plan_${tier}`;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // ---- FEEDBACK ROUTE ----
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { subject, message } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Subject and message are required." });
    }
    const senderInfo = await enrichUser(userId);
    const allProfiles = await storage.getAllUserProfiles();
    const adminProfiles = allProfiles.filter(p => p.isAdmin === true);
    await Promise.all(adminProfiles.map(p =>
      storage.createNotification({
        userId: p.userId,
        fromUserId: userId,
        type: 'feedback',
        title: `💡 Suggestion: ${subject.trim()}`,
        message: `From ${senderInfo.name || senderInfo.email || 'a user'}: ${message.trim()}`,
      })
    ));
    res.json({ success: true });
  });

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

  app.patch('/api/profile/notification-areas', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isAdmin = profile?.isAdmin === true;
    const isVendorPro = profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active';
    if (!isAdmin && !isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const { notificationAreaCodes } = req.body;
    if (!Array.isArray(notificationAreaCodes)) return res.status(400).json({ message: "notificationAreaCodes must be an array" });
    const cleaned = notificationAreaCodes.map((c: string) => String(c).trim()).filter(Boolean).slice(0, 10);
    const updated = await storage.upsertUserProfile(userId, { notificationAreaCodes: cleaned });
    res.json(updated);
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
      const isCreatorProOrAdmin = isFeatured || creatorProfile?.isAdmin === true;
      const creatorWebsiteUrl = isCreatorProOrAdmin ? (creatorProfile?.websiteUrl || null) : null;
      return { ...e, creatorName: creator.name, creatorTier: creatorProfile?.subscriptionTier, creatorWebsiteUrl, extraDates, attendingCount, interestedCount, userStatus, isFeatured };
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
    const isCreatorProOrAdmin = isFeatured || creatorProfile?.isAdmin === true;
    const creatorWebsiteUrl = isCreatorProOrAdmin ? (creatorProfile?.websiteUrl || null) : null;
    res.json({ ...event, creatorName: creator.name, creatorTier: creatorProfile?.subscriptionTier, creatorWebsiteUrl, extraDates, attendingCount, interestedCount, userStatus, vendorAttendees, registrations, isFeatured });
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

  app.post('/api/events/:id/cancel', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const isAdmin = await isAdminUser(userId);
    if (event.createdBy !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    if (event.canceledAt) return res.status(400).json({ message: "Event is already canceled" });

    await storage.cancelEvent(eventId);

    const attendance = await storage.getEventAttendance(eventId);
    const posts = await storage.getVendorPosts(eventId);
    const allUserIds = Array.from(new Set([
      ...attendance.map((a) => a.userId),
      ...posts.map((p) => p.vendorId),
    ])).filter((id) => id !== userId);

    await Promise.all(allUserIds.map((recipientId) =>
      storage.createNotification({
        userId: recipientId,
        fromUserId: userId,
        type: 'event_canceled',
        title: `Event Canceled: ${event.title}`,
        message: `The event "${event.title}" scheduled for ${new Date(event.date).toLocaleDateString()} has been canceled by the organizer.`,
        eventId,
      })
    ));

    res.json({ success: true, notified: allUserIds.length });
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
  app.get(api.vendorPosts.listByEvent.path, async (req: any, res) => {
    const eventId = Number(req.params.eventId);
    const posts = await storage.getVendorPosts(eventId);
    const enriched = await Promise.all(posts.map(async (p) => {
      const u = await enrichUser(p.vendorId);
      const vendorProfile = await storage.getUserProfile(p.vendorId);
      const isVendorProAccount = vendorProfile?.subscriptionTier === 'vendor_pro' && vendorProfile?.subscriptionStatus === 'active';
      const vendorWebsiteUrl = (isVendorProAccount || vendorProfile?.isAdmin) ? (vendorProfile?.websiteUrl || null) : null;
      const catalogAssignments = (isVendorProAccount || vendorProfile?.isAdmin)
        ? await storage.getCatalogAssignmentsForEvent(eventId, p.vendorId)
        : [];
      return { ...p, vendorName: u.name, vendorAvatar: u.avatar, vendorWebsiteUrl, catalogAssignments };
    }));
    res.json(enriched);
  });

  app.post(api.vendorPosts.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const input = api.vendorPosts.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
      const created = await storage.createVendorPost({ ...input, eventId, vendorId: userId, isVendorPro });
      const ev = await storage.getEvent(eventId);
      if (ev && (ev.vendorSpaces || 0) > 0) await storage.updateVendorSpacesUsed(eventId, 1);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });

  app.delete('/api/events/:eventId/posts/:postId', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.eventId);
    const postId = Number(req.params.postId);
    const profile = await storage.getUserProfile(userId);
    await storage.deleteVendorPost(postId, profile?.isAdmin ? undefined as any : userId);
    const ev = await storage.getEvent(eventId);
    if (ev && (ev.vendorSpaces || 0) > 0) await storage.updateVendorSpacesUsed(eventId, -1);
    res.status(204).end();
  });

  app.patch('/api/events/:eventId/posts/:postId/images', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const postId = Number(req.params.postId);
    const { imageUrls } = req.body;
    if (!Array.isArray(imageUrls)) return res.status(400).json({ message: "imageUrls must be an array" });
    const profile = await storage.getUserProfile(userId);
    const maxPhotos = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin ? 10 : 3;
    const limited = (imageUrls as string[]).slice(0, maxPhotos);
    const updated = await storage.updateVendorPostImages(postId, userId, limited);
    res.json(updated);
  });

  app.delete('/api/events/:eventId/unregister', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.eventId);
    await storage.cancelVendorRegistration(eventId, userId);
    await storage.updateVendorSpacesUsed(eventId, -1);
    res.json({ success: true });
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
    const isAdmin = profile?.isAdmin === true;
    const isEventOwnerPro = profile?.subscriptionTier === 'event_owner_pro' && profile?.subscriptionStatus === 'active';
    if (!isAdmin && !isEventOwnerPro) {
      return res.status(403).json({ message: "Event Owner Pro subscription required to send push notifications." });
    }
    const { title, message, eventId, targetAudience = 'vendor_pro' } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message required." });
    const validAudiences = ['vendor_pro', 'event_owner_pro', 'general', 'all'];
    if (!validAudiences.includes(targetAudience)) return res.status(400).json({ message: "Invalid target audience." });

    const ownerEvents = await storage.getEventsByOwner(userId);
    const ownerEventIds = ownerEvents.map(e => e.id);
    const areaCode = profile?.areaCode || '';
    const targetUserIds = await storage.getUsersForNotification(targetAudience, areaCode, ownerEventIds, userId);

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
      const square = getSquare();
      if (square) {
        try {
          const totalCents = spotPriceCents + feeCents;
          const locationId = await getSquareLocationId();
          const response = await square.checkout.paymentLinks.create({
            idempotencyKey: `reg-${reg.id}-${Date.now()}`,
            order: {
              locationId: locationId || 'DEFAULT',
              lineItems: [{
                name: `Vendor Space${spotName ? `: ${spotName}` : ''} — ${event.title}`,
                quantity: "1",
                basePriceMoney: { amount: BigInt(totalCents), currency: "USD" },
                note: `registrationId:${reg.id}|eventId:${eventId}|vendorId:${userId}`,
              }],
            },
            checkoutOptions: {
              redirectUrl: `${getHost(req)}/events/${eventId}?registered=1`,
            },
          });
          const checkoutUrl = response.paymentLink?.url;
          const paymentLinkId = response.paymentLink?.id;
          await storage.updateRegistrationStatus(reg.id, 'pending', paymentLinkId || undefined);
          return res.json({ ...reg, checkoutUrl, totalCents, feeCents });
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

  // ---- ROADMAP ----
  app.get('/api/roadmap', async (req, res) => {
    const items = await storage.getRoadmapItems();
    res.json(items);
  });

  app.post('/api/roadmap', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { title, description, expectedDate, tiersAffected, status } = req.body;
    if (!title || !description) return res.status(400).json({ message: "title and description required" });
    const item = await storage.createRoadmapItem(req.user.claims.sub, {
      title, description,
      expectedDate: expectedDate || null,
      tiersAffected: Array.isArray(tiersAffected) ? tiersAffected : [],
      status: status || "planned",
    });
    res.json(item);
  });

  app.patch('/api/roadmap/:id', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { title, description, expectedDate, tiersAffected, status } = req.body;
    const item = await storage.updateRoadmapItem(Number(req.params.id), {
      title, description,
      expectedDate: expectedDate || null,
      tiersAffected: Array.isArray(tiersAffected) ? tiersAffected : [],
      status,
    });
    res.json(item);
  });

  app.delete('/api/roadmap/:id', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteRoadmapItem(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- VENDOR CATALOG ----
  app.get('/api/vendor/catalog', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const items = await storage.getVendorCatalog(userId);
    res.json(items);
  });

  app.post('/api/vendor/catalog', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const { itemName, quantity, priceCents, imageUrl } = req.body;
    if (!itemName) return res.status(400).json({ message: "itemName required" });
    const item = await storage.createVendorCatalogItem(userId, {
      itemName,
      quantity: Number(quantity) || 0,
      priceCents: Number(priceCents) || 0,
      imageUrl: imageUrl || null,
    });
    res.json(item);
  });

  app.patch('/api/vendor/catalog/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const id = Number(req.params.id);
    const { itemName, quantity, priceCents, imageUrl } = req.body;
    const item = await storage.updateVendorCatalogItem(id, { itemName, quantity: Number(quantity), priceCents: Number(priceCents), imageUrl: imageUrl || null });
    res.json(item);
  });

  app.delete('/api/vendor/catalog/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    await storage.deleteVendorCatalogItem(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post('/api/vendor/catalog/:id/assign', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const catalogItemId = Number(req.params.id);
    const { eventId, quantityAssigned } = req.body;
    if (!eventId || quantityAssigned === undefined) return res.status(400).json({ message: "eventId and quantityAssigned required" });
    const assignment = await storage.assignCatalogItemToEvent(catalogItemId, Number(eventId), userId, Number(quantityAssigned));
    res.json(assignment);
  });

  app.delete('/api/vendor/catalog/:id/assign/:eventId', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    await storage.removeCatalogItemFromEvent(Number(req.params.id), Number(req.params.eventId));
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

  // ---- SQUARE ROUTES ----
  app.get(api.square.subscriptionStatus.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    res.json({ status: profile?.subscriptionStatus || 'inactive', tier: profile?.subscriptionTier || 'free', subscriptionId: profile?.stripeSubscriptionId });
  });

  app.post(api.square.acceptTerms.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { tier } = req.body;
    if (!tier) return res.status(400).json({ message: "Tier required." });
    await storage.acceptTerms(userId, tier);
    res.json({ success: true });
  });

  app.post(api.square.upgradeCheckout.path, isAuthenticated, async (req: any, res) => {
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured. Ask the admin to add SQUARE_ACCESS_TOKEN." });
    const { tier, promoCode } = req.body;
    const tierInfo = PRO_TIERS[tier as keyof typeof PRO_TIERS];
    if (!tierInfo) return res.status(400).json({ message: "Invalid tier." });
    const userId = req.user.claims.sub;
    const user = await authStorage.getUser(userId);
    const locationId = await getSquareLocationId();
    if (!locationId) return res.status(503).json({ message: "Square Location ID not configured. Set it in Admin → Settings." });
    await storage.acceptTerms(userId, tier);

    let finalPrice: number = tierInfo.price;
    let promoLabel = '';
    let redeemedPromo: any = null;
    if (promoCode) {
      const validation = await storage.validatePromoCode(promoCode, tier);
      if (!validation.valid) return res.status(400).json({ message: validation.error });
      if (validation.promoCode?.type === 'discount') {
        const discount = validation.promoCode.discountPercent || 0;
        finalPrice = Math.round(tierInfo.price * (1 - discount / 100));
        promoLabel = ` (${discount}% off — code: ${promoCode.toUpperCase()})`;
        redeemedPromo = validation.promoCode;
      }
    }

    try {
      const response = await square.checkout.paymentLinks.create({
        idempotencyKey: `upgrade-${userId}-${tier}-${Date.now()}`,
        order: {
          locationId,
          lineItems: [{
            name: `${tierInfo.label} — Monthly Subscription${promoLabel}`,
            quantity: "1",
            basePriceMoney: { amount: BigInt(finalPrice), currency: "USD" },
            note: `userId:${userId}|tier:${tier}`,
          }],
        },
        checkoutOptions: {
          redirectUrl: `${getHost(req)}/profile?subscribed=${tier}`,
        },
        prePopulatedData: { buyerEmail: user?.email || undefined },
      });
      const url = response.paymentLink?.url;
      if (!url) return res.status(500).json({ message: "Failed to create Square payment link." });
      if (redeemedPromo) await storage.redeemPromoCode(promoCode, userId, tier);
      res.json({ url });
    } catch (e: any) {
      return res.status(500).json({ message: e.message || "Square error" });
    }
  });

  // New: create a real recurring Square subscription (card on file + Subscriptions API)
  app.post('/api/square/subscribe', isAuthenticated, async (req: any, res) => {
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured." });
    const { tier, sourceId, promoCode } = req.body;
    if (!sourceId) return res.status(400).json({ message: "Card token is required." });
    const tierInfo = PRO_TIERS[tier as keyof typeof PRO_TIERS];
    if (!tierInfo) return res.status(400).json({ message: "Invalid tier." });
    const planVariationId = await storage.getAdminSetting(`square_plan_${tier}`);
    if (!planVariationId) return res.status(503).json({ message: `Subscription plan not configured for ${tierInfo.label}. Contact the admin.` });
    const locationId = await getSquareLocationId();
    if (!locationId) return res.status(503).json({ message: "Square Location ID not configured." });
    const userId = req.user.claims.sub;
    const user = await authStorage.getUser(userId);
    const profile = await storage.getUserProfile(userId);
    let redeemedPromo: any = null;
    if (promoCode) {
      const validation = await storage.validatePromoCode(promoCode, tier);
      if (!validation.valid) return res.status(400).json({ message: validation.error });
      redeemedPromo = validation.promoCode;
    }
    try {
      let customerId = profile?.stripeCustomerId;
      if (!customerId) {
        const customerRes = await (square as any).customers.create({
          idempotencyKey: `cust-${userId}-${Date.now()}`,
          givenName: user?.firstName || 'VendorLoop',
          familyName: user?.lastName || 'User',
          emailAddress: user?.email || undefined,
          referenceId: userId,
        });
        customerId = customerRes.customer?.id;
        if (!customerId) return res.status(500).json({ message: "Failed to create Square customer." });
        await storage.upsertUserProfile(userId, { stripeCustomerId: customerId });
      }
      const cardRes = await (square as any).cards.create({
        idempotencyKey: `card-${userId}-${Date.now()}`,
        sourceId,
        card: { customerId },
      });
      const cardId = cardRes.card?.id;
      if (!cardId) return res.status(500).json({ message: "Failed to save payment method." });
      const subRes = await (square as any).subscriptions.create({
        idempotencyKey: `sub-${userId}-${tier}-${Date.now()}`,
        locationId,
        planVariationId,
        customerId,
        cardId,
        startDate: new Date().toISOString().split('T')[0],
      });
      const subscription = subRes.subscription;
      if (!subscription) return res.status(500).json({ message: "Failed to create subscription." });
      await storage.upsertUserProfile(userId, {
        subscriptionTier: tier as any,
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscription.id,
        profileType: tierToProfileType(tier) as any,
      });
      await storage.acceptTerms(userId, tier);
      if (redeemedPromo) await storage.redeemPromoCode(promoCode, userId, tier);
      res.json({ success: true, subscriptionId: subscription.id });
    } catch (e: any) {
      console.error('Square subscribe error:', e);
      const msg = e?.errors?.[0]?.detail || e.message || "Subscription error.";
      return res.status(500).json({ message: msg });
    }
  });

  app.post(api.square.subscriptionComplete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { tier } = req.body;
    if (!tier || !['event_owner_pro', 'vendor_pro'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier." });
    }
    await storage.upsertUserProfile(userId, {
      subscriptionTier: tier as any,
      subscriptionStatus: 'active',
      profileType: tierToProfileType(tier) as any,
    });
    res.json({ success: true });
  });

  app.post(api.square.manageSubscription.path, isAuthenticated, async (req: any, res) => {
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured." });
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!profile?.stripeSubscriptionId) {
      return res.json({ url: "https://squareup.com/dashboard" });
    }
    res.json({ url: "https://squareup.com/dashboard" });
  });

  // Square webhook
  app.post('/api/square/webhook', async (req: any, res) => {
    try {
      const body = req.body;
      const eventType = body?.type;
      if (eventType === 'payment.completed') {
        const payment = body?.data?.object?.payment;
        if (payment) {
          const square = getSquare();
          if (square && payment.orderId) {
            const orderResponse = await square.orders.get({ orderId: payment.orderId });
            const lineItems = orderResponse.order?.lineItems || [];
            for (const item of lineItems) {
              const note = item.note || '';
              const userIdMatch = note.match(/userId:([^|]+)/);
              const tierMatch = note.match(/tier:([^|]+)/);
              if (userIdMatch && tierMatch) {
                const userId = userIdMatch[1];
                const tier = tierMatch[1];
                if (['event_owner_pro', 'vendor_pro'].includes(tier)) {
                  await storage.upsertUserProfile(userId, {
                    subscriptionTier: tier as any,
                    subscriptionStatus: 'active',
                    stripeSubscriptionId: payment.id,
                    profileType: tierToProfileType(tier) as any,
                  });
                }
              }
            }
          }
        }
      }
      if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
        const subscription = body?.data?.object?.subscription;
        if (subscription?.subscriberId) {
          const profiles = await storage.getAllUserProfiles();
          const profile = profiles.find(p => p.stripeCustomerId === subscription.subscriberId);
          if (profile) {
            const status = subscription.status === 'ACTIVE' ? 'active' : 'inactive';
            await storage.upsertUserProfile(profile.userId, { stripeSubscriptionId: subscription.id, subscriptionStatus: status });
          }
        }
      }
      if (eventType === 'subscription.deactivated') {
        const subscription = body?.data?.object?.subscription;
        if (subscription?.subscriberId) {
          const profiles = await storage.getAllUserProfiles();
          const profile = profiles.find(p => p.stripeCustomerId === subscription.subscriberId);
          if (profile) {
            await storage.upsertUserProfile(profile.userId, { subscriptionStatus: 'inactive', subscriptionTier: 'free', profileType: 'general' as any });
          }
        }
      }
    } catch (e) {
      console.error('Square webhook error:', e);
    }
    res.json({ received: true });
  });

  // ---- ADMIN SQUARE FINANCIAL ROUTES ----
  app.get('/api/admin/square/payments', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured." });
    const locationId = await getSquareLocationId();
    try {
      const listReq: any = { limit: 50, sortField: 'CREATED_AT', sortOrder: 'DESC' };
      if (locationId) listReq.locationId = locationId;
      const response = await square.payments.list(listReq);
      const allPayments: any[] = [];
      for await (const item of response) {
        allPayments.push(item);
        if (allPayments.length >= 50) break;
      }
      res.json(squareJson(allPayments));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/square/refund', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured." });
    const { paymentId, amountCents, reason } = req.body;
    if (!paymentId) return res.status(400).json({ message: "paymentId required." });
    try {
      const payment = await square.payments.get({ paymentId });
      const amountToRefund = amountCents ? BigInt(amountCents) : payment.payment?.amountMoney?.amount;
      const response = await square.refunds.refundPayment({
        idempotencyKey: `refund-${paymentId}-${Date.now()}`,
        paymentId,
        amountMoney: { amount: amountToRefund, currency: "USD" },
        reason: reason || "Admin-initiated refund",
      });
      res.json(squareJson(response.refund));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/square/activate-subscription', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { userId, tier, status } = req.body;
    if (!userId || !tier) return res.status(400).json({ message: "userId and tier required." });
    const validTier = ['event_owner_pro', 'vendor_pro', 'free'].includes(tier) ? tier : 'free';
    const validStatus = status === 'active' ? 'active' : 'inactive';
    await storage.upsertUserProfile(userId, {
      subscriptionTier: validTier as any,
      subscriptionStatus: validStatus,
      profileType: (validStatus === 'active' ? tierToProfileType(validTier) : 'general') as any,
    });
    res.json({ success: true });
  });

  // List Square locations (for admin settings UI)
  app.get('/api/admin/square/locations', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured." });
    try {
      const response = await square.locations.list();
      const locations = (response as any).locations || (response as any).data || [];
      res.json(squareJson(locations));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // List Square subscription plans from Catalog (for admin settings UI)
  app.get('/api/admin/square/subscription-plans', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const square = getSquare();
    if (!square) return res.status(503).json({ message: "Square not configured." });
    try {
      const response = await (square as any).catalog.list({ types: ['SUBSCRIPTION_PLAN'] });
      const objects = (response as any).objects || [];
      res.json(squareJson(objects));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Public Square config for Web Payments SDK initialization
  app.get('/api/square/config', async (req: any, res) => {
    const appId = await storage.getAdminSetting('square_application_id');
    const locationId = await getSquareLocationId();
    const environment = process.env.SQUARE_ENVIRONMENT || 'production';
    res.json({ appId: appId || null, locationId: locationId || null, environment });
  });

  // ---- Promo Codes ----
  app.get('/api/admin/promo-codes', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const codes = await storage.getAllPromoCodes();
    res.json(codes);
  });

  app.post('/api/admin/promo-codes', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { code, type, discountPercent, applicableTier, expiresAt, maxUses } = req.body;
    if (!code || !type) return res.status(400).json({ message: "Code and type are required." });
    if (type === 'discount' && (!discountPercent || discountPercent < 1 || discountPercent > 100)) {
      return res.status(400).json({ message: "Discount percent must be 1–100 for discount codes." });
    }
    try {
      const promo = await storage.createPromoCode(req.user.claims.sub, { code, type, discountPercent, applicableTier: applicableTier || null, expiresAt: expiresAt || null, maxUses: maxUses || null });
      res.json(promo);
    } catch (e: any) {
      if (e.message?.includes('unique')) return res.status(409).json({ message: "A promo code with that name already exists." });
      throw e;
    }
  });

  app.delete('/api/admin/promo-codes/:id', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const id = parseInt(req.params.id);
    const code = (await storage.getAllPromoCodes()).find(c => c.id === id);
    if (code?.type === 'temp_admin') {
      await storage.revokePromoCodeAccess(id);
    } else {
      await storage.deactivatePromoCode(id);
    }
    res.json({ success: true });
  });

  app.post('/api/promo-codes/validate', isAuthenticated, async (req: any, res) => {
    const { code, tier } = req.body;
    if (!code || !tier) return res.status(400).json({ message: "Code and tier required." });
    const result = await storage.validatePromoCode(code, tier);
    res.json(result);
  });

  app.post('/api/promo-codes/redeem-admin', isAuthenticated, async (req: any, res) => {
    const { code } = req.body;
    const userId = req.user.claims.sub;
    if (!code) return res.status(400).json({ message: "Code required." });
    const result = await storage.validatePromoCode(code, 'temp_admin');
    if (!result.valid || result.promoCode?.type !== 'temp_admin') {
      return res.status(400).json({ message: result.error || "Invalid temp admin code." });
    }
    await storage.redeemPromoCode(code, userId, 'temp_admin');
    await storage.upsertUserProfile(userId, { isAdmin: true });
    res.json({ success: true });
  });

  return httpServer;
}
