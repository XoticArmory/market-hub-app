import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, PRO_TIERS } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { pool } from "./db";

const UPLOAD_BUCKET = "vendor-photos";

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  },
});

function tierToProfileType(_tier: string): string {
  return 'pro';
}

// Both legacy event_owner_pro and vendor_pro grant full Pro access.
function isPro(profile: any): boolean {
  if (!profile) return false;
  if (profile.isAdmin === true) return true;
  return (profile.subscriptionTier === 'vendor_pro' || profile.subscriptionTier === 'event_owner_pro')
    && profile.subscriptionStatus === 'active';
}

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' as any });
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


export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/login", (_req, res) => res.redirect("/auth"));
  app.get("/api/logout", (_req, res) => res.redirect("/"));
  app.get("/api/callback", (_req, res) => res.redirect("/auth"));

  await setupAuth(app);
  registerAuthRoutes(app);

  // ---- ANONYMOUS EVENT CLICK TRACKING (public, no auth required) ----
  app.post('/api/track/event-click', async (req, res) => {
    try {
      const { eventId, sessionId } = req.body;
      if (!eventId || !sessionId || typeof eventId !== 'number' || typeof sessionId !== 'string') {
        return res.status(400).json({ message: "eventId and sessionId required" });
      }
      await storage.recordAnonymousClick(eventId, sessionId);
      res.json({ ok: true });
    } catch {
      res.json({ ok: true }); // silently succeed even on error
    }
  });

  app.get('/api/admin/anonymous-clicks', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const stats = await storage.getAnonymousClickStats();
    res.json(stats);
  });

  // ---- ENSURE SUPABASE STORAGE BUCKET EXISTS ----
  (async () => {
    const supabase = getStorageClient();
    if (!supabase) return;
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === UPLOAD_BUCKET);
    if (!exists) {
      const { error } = await supabase.storage.createBucket(UPLOAD_BUCKET, { public: true });
      if (error) console.error("Failed to create storage bucket:", error.message);
      else console.log(`Created Supabase Storage bucket: ${UPLOAD_BUCKET}`);
    }
  })();

  // ---- FILE UPLOAD ----
  app.post("/api/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    const supabase = getStorageClient();
    if (!supabase) return res.status(500).json({ message: "Storage not configured." });
    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) {
      console.error("Supabase storage upload error:", error);
      return res.status(500).json({ message: error.message });
    }
    const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(filename);
    res.json({ url: data.publicUrl });
  });

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
      // Vendor profile type requires an active Vendor Pro subscription
      if (input.profileType === 'vendor') {
        const existing = await storage.getUserProfile(userId);
        const isAdmin = existing?.isAdmin === true;
        const isVendorPro = existing?.subscriptionTier === 'vendor_pro' && existing?.subscriptionStatus === 'active';
        if (!isAdmin && !isVendorPro) {
          return res.status(403).json({ message: "Vendor Pro subscription required to use a vendor account." });
        }
      }
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
      const isFeatured = isPro(creatorProfile);
      const creatorWebsiteUrl = isFeatured ? (creatorProfile?.websiteUrl || null) : null;
      const { registrationCode: _rc, ...eventPublic } = e;
      return { ...eventPublic, creatorName: creator.name, creatorTier: creatorProfile?.subscriptionTier, creatorWebsiteUrl, extraDates, attendingCount, interestedCount, userStatus, isFeatured };
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
    const isFeatured = isPro(creatorProfile);
    const creatorWebsiteUrl = isFeatured ? (creatorProfile?.websiteUrl || null) : null;
    const requesterId = req.user?.claims?.sub;
    const requesterProfile = await storage.getUserProfile(requesterId || '');
    const isRequesterAdmin = requesterProfile?.isAdmin === true;
    // Only Pro accounts (or admins) who own this event can see the registration code
    const canSeeCode = isRequesterAdmin || (requesterId === event.createdBy && (isPro(requesterProfile) || isRequesterAdmin));
    const { registrationCode: rawCode, ...eventWithoutCode } = event;
    const responseEvent = canSeeCode ? { ...event } : { ...eventWithoutCode };
    res.json({ ...responseEvent, creatorName: creator.name, creatorTier: creatorProfile?.subscriptionTier, creatorWebsiteUrl, extraDates, attendingCount, interestedCount, userStatus, vendorAttendees, registrations, isFeatured });
  });

  app.post(api.events.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      const isAdmin = profile?.isAdmin === true;
      if (!isAdmin && !isPro(profile)) {
        return res.status(403).json({ message: "Pro subscription required to create events." });
      }
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

  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    const isAdmin = profile?.isAdmin === true;
    if (event.createdBy !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    if (!isPro(profile) && !isAdmin) return res.status(403).json({ message: "Pro subscription required to edit events." });
    const allowed = ['title', 'description', 'location', 'areaCode', 'date', 'vendorSpaces', 'spotPrice', 'registrationCode', 'vendorRegistrationType', 'vendorRegistrationUrl', 'contactEmail'];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if (data.date) data.date = new Date(data.date);
    if (data.vendorSpaces !== undefined) data.vendorSpaces = Number(data.vendorSpaces);
    if (data.spotPrice !== undefined) data.spotPrice = Number(data.spotPrice);
    const updated = await storage.updateEvent(eventId, data);
    res.json(updated);
  });

  app.post('/api/admin/events/:id/transfer', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) return res.status(403).json({ message: "Admin only" });
    const { newOwnerId } = req.body;
    if (!newOwnerId) return res.status(400).json({ message: "newOwnerId required" });
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const newOwner = await storage.getUserProfile(newOwnerId);
    if (!newOwner) return res.status(404).json({ message: "User not found" });
    const updated = await storage.transferEventOwnership(eventId, newOwnerId);
    res.json(updated);
  });

  app.patch('/api/events/:id/banner', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    const isAdmin = profile?.isAdmin === true;
    if (event.createdBy !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    if (!isPro(profile) && !isAdmin) return res.status(403).json({ message: "Pro subscription required to change event banners." });
    const { bannerUrl } = req.body;
    await storage.updateEventBanner(eventId, bannerUrl || null);
    res.json({ success: true });
  });

  app.post('/api/events/:id/cancel', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    const isAdmin = profile?.isAdmin === true;
    if (event.createdBy !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    if (!isPro(profile) && !isAdmin) return res.status(403).json({ message: "Pro subscription required to cancel events." });
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

  // ---- EVENT VENDOR ENTRIES (owner-added) ----
  app.get('/api/events/:id/vendor-entries', async (req: any, res) => {
    const eventId = Number(req.params.id);
    const entries = await storage.getEventVendorEntries(eventId);
    res.json(entries);
  });

  app.post('/api/events/:id/vendor-entries/lookup-email', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    if (event.createdBy !== userId && !profile?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.json({ found: false });
    res.json({ found: true, userId: user.id, userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email });
  });

  app.post('/api/events/:id/vendor-entries', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    if (event.createdBy !== userId && !profile?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    if (!isPro(profile)) return res.status(403).json({ message: "Pro subscription required." });
    const { name, description, email, matchedUserId, sendNotification } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Vendor name is required" });
    const verificationCode = sendNotification && matchedUserId
      ? Math.random().toString(36).slice(2, 8).toUpperCase()
      : undefined;
    const entry = await storage.createEventVendorEntry({
      eventId, addedBy: userId,
      name: name.trim(),
      description: description?.trim() || undefined,
      email: email?.trim() || undefined,
      verificationCode,
      matchedUserId: matchedUserId || undefined,
    });
    if (sendNotification && matchedUserId && verificationCode) {
      await storage.createNotification({
        userId: matchedUserId,
        fromUserId: userId,
        type: "vendor_invite",
        title: `You've been added to ${event.title}`,
        message: `${profile?.businessName || 'An event owner'} added you as a vendor at "${event.title}". Your verification code is: ${verificationCode}`,
        eventId,
      });
    }
    res.status(201).json(entry);
  });

  app.delete('/api/events/:id/vendor-entries/:entryId', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.id);
    const entryId = Number(req.params.entryId);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const profile = await storage.getUserProfile(userId);
    if (event.createdBy !== userId && !profile?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteEventVendorEntry(entryId);
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
      if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro subscription required to post a vendor listing." });
      const existingPost = await storage.getVendorPostForUser(eventId, userId);
      if (existingPost) return res.status(409).json({ message: "You already have a listing for this event. Remove your existing listing first." });
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
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro subscription required to manage photos." });
    const limited = (imageUrls as string[]).slice(0, 10);
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

  // ---- APPLICATION APPROVAL ----
  app.patch('/api/events/:eventId/registrations/:regId/approve', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.eventId);
    const regId = Number(req.params.regId);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy !== userId) {
      const profile = await storage.getUserProfile(userId);
      if (!profile?.isAdmin) return res.status(403).json({ message: "Only the event owner can approve applications." });
    }
    await storage.updateRegistrationStatus(regId, 'approved');
    await storage.updateVendorSpacesUsed(eventId, 1);
    res.json({ success: true });
  });

  app.patch('/api/events/:eventId/registrations/:regId/reject', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const eventId = Number(req.params.eventId);
    const regId = Number(req.params.regId);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy !== userId) {
      const profile = await storage.getUserProfile(userId);
      if (!profile?.isAdmin) return res.status(403).json({ message: "Only the event owner can reject applications." });
    }
    await storage.updateRegistrationStatus(regId, 'rejected');
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

  app.delete("/api/messages/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) return res.status(403).json({ message: "Admin access required." });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid message ID." });
    await storage.deleteMessage(id);
    res.json({ success: true });
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
    if (!isAdmin && !isPro(profile)) {
      return res.status(403).json({ message: "Pro subscription required to send push notifications." });
    }
    const { title, message, eventId, targetAudience = 'vendor_pro' } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message required." });
    const validAudiences = ['vendor_pro', 'general', 'all'];
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
    if (!isPro(profile) && !profile?.isAdmin) {
      return res.status(403).json({ message: "Pro subscription required to create event maps." });
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
    const { spotId, spotName, registrationCode } = req.body;
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const profile = await storage.getUserProfile(userId);
    const isVendorProCheck = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorProCheck) return res.status(403).json({ message: "Vendor Pro subscription required to register for vendor spaces." });

    const existing = await storage.getVendorRegistrationForUser(eventId, userId);
    if (existing) return res.status(409).json({ message: "You are already registered for this event." });

    const isPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;

    // Application-form flow: create a pending-approval registration and stop
    if (event.vendorRegistrationType === 'form') {
      const reg = await storage.createVendorRegistration({
        eventId,
        vendorId: userId,
        spotId: spotId || null,
        spotName: spotName || null,
        amountCents: 0,
        feeCents: 0,
        isPro,
        status: 'awaiting_approval',
        stripePaymentIntentId: null,
      });
      return res.json(reg);
    }

    const hasValidCode = !!(
      event.registrationCode &&
      registrationCode &&
      registrationCode.trim().toUpperCase() === event.registrationCode.trim().toUpperCase()
    );

    if (registrationCode && !hasValidCode) {
      return res.status(400).json({ message: "Invalid registration code. Please check with the event organizer." });
    }
    const spotPriceCents = hasValidCode ? 0 : (event.spotPrice || 0);
    const feeCents = (isPro || hasValidCode) ? 0 : Math.round(spotPriceCents * 0.005);
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
      // Check if event owner has Square configured
      const ownerProfile = await storage.getUserProfile(event.createdBy);
      if (ownerProfile?.squareAccessToken && ownerProfile?.squareLocationId) {
        // Route through owner's Square account
        try {
          const totalCents = spotPriceCents + feeCents;
          const idempotencyKey = `reg-${reg.id}-${Date.now()}`;
          const sqBody = {
            idempotency_key: idempotencyKey,
            quick_pay: {
              name: `Vendor Space${spotName ? `: ${spotName}` : ''} — ${event.title}`,
              price_money: { amount: totalCents, currency: 'USD' },
              location_id: ownerProfile.squareLocationId,
            },
            pre_populated_data: {},
            checkout_options: {
              redirect_url: `${getHost(req)}/events/${eventId}?setup_listing=1`,
            },
          };
          const sqResp = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ownerProfile.squareAccessToken}`,
              'Square-Version': '2024-01-18',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sqBody),
          });
          if (sqResp.ok) {
            const sqData = await sqResp.json() as any;
            const checkoutUrl = sqData?.payment_link?.url;
            if (checkoutUrl) {
              await storage.updateRegistrationStatus(reg.id, 'pending', idempotencyKey);
              return res.json({ ...reg, checkoutUrl, totalCents, feeCents, processor: 'square' });
            }
          }
        } catch (_) { /* fall through to Stripe */ }
      }

      // Stripe payment — route to owner's connected account if available
      const stripe = getStripe();
      if (stripe) {
        try {
          const totalCents = spotPriceCents + feeCents;
          const sessionParams: any = {
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'usd',
                unit_amount: totalCents,
                product_data: {
                  name: `Vendor Space${spotName ? `: ${spotName}` : ''} — ${event.title}`,
                },
              },
              quantity: 1,
            }],
            metadata: {
              type: 'vendor_space',
              registrationId: String(reg.id),
              eventId: String(eventId),
              vendorId: userId,
            },
            success_url: `${getHost(req)}/events/${eventId}?setup_listing=1`,
            cancel_url: `${getHost(req)}/events/${eventId}`,
          };
          // Route to owner's Stripe Connect account if onboarded
          if (ownerProfile?.stripeConnectAccountId && ownerProfile?.stripeConnectOnboarded) {
            sessionParams.payment_intent_data = {
              transfer_data: { destination: ownerProfile.stripeConnectAccountId },
              ...(feeCents > 0 ? { application_fee_amount: feeCents } : {}),
            };
          }
          const session = await stripe.checkout.sessions.create(sessionParams);
          await storage.updateRegistrationStatus(reg.id, 'pending', session.id);
          return res.json({ ...reg, checkoutUrl: session.url, totalCents, feeCents });
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
    if (!itemName) return res.status(400).json({ message: "itemName required" });
    let eventTitle: string | null = null;
    let eventDate: Date | null = null;
    if (eventId) {
      const event = await storage.getEvent(Number(eventId));
      if (event) { eventTitle = event.title; eventDate = event.date; }
    }
    const item = await storage.createVendorInventoryItem(userId, {
      eventId: eventId ? Number(eventId) : null,
      eventTitle,
      eventDate,
      itemName,
      quantityBrought: Number(quantityBrought) || 0,
      quantitySold: Number(quantitySold) || 0,
      priceCents: Number(priceCents) || 0,
    });
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

    // Auto-create or update the inventory tracker entry for this event
    const catalogItem = await storage.getCatalogItem(catalogItemId);
    if (catalogItem) {
      const ev = await storage.getEvent(Number(eventId));
      const existing = await storage.getVendorInventoryByNameAndEvent(userId, Number(eventId), catalogItem.itemName);
      if (existing) {
        await storage.updateVendorInventoryItem(existing.id, { quantityBrought: Number(quantityAssigned) });
      } else {
        await storage.createVendorInventoryItem(userId, {
          eventId: Number(eventId),
          eventTitle: ev?.title || null,
          eventDate: ev?.date || null,
          itemName: catalogItem.itemName,
          quantityBrought: Number(quantityAssigned),
          quantitySold: 0,
          priceCents: catalogItem.priceCents,
        });
      }
    }

    res.json(assignment);
  });

  app.delete('/api/vendor/catalog/:id/assign/:eventId', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const isVendorPro = (profile?.subscriptionTier === 'vendor_pro' && profile?.subscriptionStatus === 'active') || profile?.isAdmin === true;
    if (!isVendorPro) return res.status(403).json({ message: "Vendor Pro required" });
    const catalogItemId = Number(req.params.id);
    const eid = Number(req.params.eventId);

    // Remove matching inventory entry (only if no sales have been logged)
    const catalogItem = await storage.getCatalogItem(catalogItemId);
    if (catalogItem) {
      const existing = await storage.getVendorInventoryByNameAndEvent(userId, eid, catalogItem.itemName);
      if (existing && existing.quantitySold === 0) {
        await storage.deleteVendorInventoryItem(existing.id);
      }
    }

    await storage.removeCatalogItemFromEvent(catalogItemId, eid);
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
    const requesterId = req.user.claims.sub;
    const { userId } = req.params;
    const requesterProfile = await storage.getUserProfile(requesterId);
    const isAdmin = requesterProfile?.isAdmin === true;
    // Admins can view anyone's analytics; Pro users can only view their own
    if (!isAdmin && !(isPro(requesterProfile) && requesterId === userId)) {
      return res.status(403).json({ message: "Pro subscription required to view analytics." });
    }
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

  // ---- PAYMENT PROCESSOR CONNECTION (Stripe Connect / Square) ----

  // Get current user's payment connection status
  app.get('/api/connect/status', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    if (!isPro(profile)) return res.status(403).json({ message: "Pro subscription required" });
    res.json({
      stripe: profile.stripeConnectAccountId ? {
        accountId: profile.stripeConnectAccountId,
        onboarded: profile.stripeConnectOnboarded || false,
      } : null,
      square: (profile.squareLocationId) ? {
        locationId: profile.squareLocationId,
        connected: true,
      } : null,
    });
  });

  // Start Stripe Connect Express onboarding
  app.post('/api/connect/stripe/start', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!isPro(profile)) return res.status(403).json({ message: "Pro subscription required" });
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured." });
    try {
      let accountId = profile?.stripeConnectAccountId;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        });
        accountId = account.id;
        await storage.upsertUserProfile(userId, { stripeConnectAccountId: accountId, stripeConnectOnboarded: false });
      }
      const host = getHost(req);
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: `${host}/profile?connect=stripe&result=success`,
        refresh_url: `${host}/api/connect/stripe/refresh?userId=${userId}`,
      });
      res.json({ url: link.url });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Refresh expired Stripe Connect onboarding link
  app.get('/api/connect/stripe/refresh', async (req: any, res) => {
    const { userId } = req.query;
    if (!userId) return res.redirect('/profile');
    const profile = await storage.getUserProfile(userId as string);
    const accountId = profile?.stripeConnectAccountId;
    if (!accountId) return res.redirect('/profile');
    const stripe = getStripe();
    if (!stripe) return res.redirect('/profile');
    try {
      const host = `${req.protocol}://${req.hostname}`;
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: `${host}/profile?connect=stripe&result=success`,
        refresh_url: `${host}/api/connect/stripe/refresh?userId=${userId}`,
      });
      res.redirect(link.url);
    } catch {
      res.redirect('/profile');
    }
  });

  // Verify and mark Stripe Connect onboarding complete
  app.post('/api/connect/stripe/verify', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const accountId = profile?.stripeConnectAccountId;
    if (!accountId) return res.status(400).json({ message: "No Stripe Connect account found" });
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    try {
      const account = await stripe.accounts.retrieve(accountId);
      const onboarded = account.details_submitted && !account.requirements?.currently_due?.length;
      await storage.upsertUserProfile(userId, { stripeConnectOnboarded: onboarded || false });
      res.json({ onboarded, accountId });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Disconnect Stripe Connect
  app.delete('/api/connect/stripe', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!isPro(profile)) return res.status(403).json({ message: "Pro subscription required" });
    await storage.upsertUserProfile(userId, { stripeConnectAccountId: undefined as any, stripeConnectOnboarded: false });
    res.json({ ok: true });
  });

  // Save Square credentials
  app.post('/api/connect/square', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!isPro(profile)) return res.status(403).json({ message: "Pro subscription required" });
    const { accessToken, locationId } = req.body;
    if (!accessToken || !locationId) return res.status(400).json({ message: "Access token and location ID are required" });
    // Verify credentials by calling Square API
    try {
      const resp = await fetch(`https://connect.squareup.com/v2/locations/${locationId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' },
      });
      if (!resp.ok) return res.status(400).json({ message: "Invalid Square credentials. Please check your access token and location ID." });
      await storage.upsertUserProfile(userId, { squareAccessToken: accessToken, squareLocationId: locationId });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Disconnect Square
  app.delete('/api/connect/square', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!isPro(profile)) return res.status(403).json({ message: "Pro subscription required" });
    await storage.upsertUserProfile(userId, { squareAccessToken: undefined as any, squareLocationId: undefined as any });
    res.json({ ok: true });
  });

  // ---- STRIPE ROUTES ----
  app.get(api.stripe.subscriptionStatus.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    res.json({ status: profile?.subscriptionStatus || 'inactive', tier: profile?.subscriptionTier || 'free', subscriptionId: profile?.stripeSubscriptionId });
  });

  app.post(api.stripe.acceptTerms.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { tier } = req.body;
    if (!tier) return res.status(400).json({ message: "Tier required." });
    await storage.acceptTerms(userId, tier);
    res.json({ success: true });
  });

  app.post(api.stripe.checkout.path, isAuthenticated, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured. Set STRIPE_SECRET_KEY in environment secrets." });
    const { tier, promoCode, returnTo } = req.body;
    const tierInfo = PRO_TIERS[tier as keyof typeof PRO_TIERS];
    if (!tierInfo) return res.status(400).json({ message: "Invalid tier." });
    const userId = req.user.claims.sub;
    const user = await authStorage.getUser(userId);
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
        promoLabel = ` (${discount}% off)`;
        redeemedPromo = validation.promoCode;
      }
    }

    try {
      const profile = await storage.getUserProfile(userId);
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `${tierInfo.label} — Monthly Subscription${promoLabel}` },
            unit_amount: finalPrice,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        success_url: `${getHost(req)}${returnTo || '/profile'}?subscribed=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getHost(req)}/upgrade`,
        metadata: { userId, tier },
      };
      if (user?.email) sessionParams.customer_email = user.email;
      if (profile?.stripeCustomerId) {
        delete sessionParams.customer_email;
        sessionParams.customer = profile.stripeCustomerId;
      }
      const session = await stripe.checkout.sessions.create(sessionParams);
      if (!session.url) return res.status(500).json({ message: "Failed to create Stripe checkout session." });
      if (redeemedPromo) await storage.redeemPromoCode(promoCode, userId, tier);
      res.json({ url: session.url });
    } catch (e: any) {
      console.error('Stripe checkout error:', e);
      return res.status(500).json({ message: e.message || "Stripe error" });
    }
  });

  app.post(api.stripe.manageSubscription.path, isAuthenticated, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured." });
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!profile?.stripeCustomerId) {
      return res.json({ url: `${getHost(req)}/upgrade` });
    }
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: `${getHost(req)}/profile`,
      });
      res.json({ url: session.url });
    } catch (e: any) {
      console.error('Stripe portal error:', e);
      return res.status(500).json({ message: e.message || "Could not open billing portal." });
    }
  });

  // Stripe webhook
  app.post('/api/stripe/webhook', async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured." });
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } else {
        event = req.body as Stripe.Event;
      }
    } catch (e: any) {
      console.error('Stripe webhook signature error:', e.message);
      return res.status(400).json({ message: `Webhook error: ${e.message}` });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const type = session.metadata?.type;

          if (type === 'vendor_space') {
            const registrationId = Number(session.metadata?.registrationId);
            if (registrationId) {
              await storage.updateRegistrationStatus(registrationId, 'paid', session.id);
              const eventId = Number(session.metadata?.eventId);
              if (eventId) await storage.updateVendorSpacesUsed(eventId, 1);
            }
          } else {
            const userId = session.metadata?.userId;
            const tier = session.metadata?.tier;
            if (userId && tier && ['vendor_pro', 'event_owner_pro'].includes(tier)) {
              const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
              const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
              await storage.upsertUserProfile(userId, {
                subscriptionTier: tier as any,
                subscriptionStatus: 'active',
                stripeCustomerId: customerId || undefined,
                stripeSubscriptionId: subscriptionId || undefined,
                profileType: tierToProfileType(tier) as any,
              });
            }
          }
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
          if (customerId) {
            const profiles = await storage.getAllUserProfiles();
            const profile = profiles.find(p => p.stripeCustomerId === customerId);
            if (profile) {
              const status = sub.status === 'active' ? 'active' : 'inactive';
              await storage.upsertUserProfile(profile.userId, { stripeSubscriptionId: sub.id, subscriptionStatus: status });
            }
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
          if (customerId) {
            const profiles = await storage.getAllUserProfiles();
            const profile = profiles.find(p => p.stripeCustomerId === customerId);
            if (profile) {
              await storage.upsertUserProfile(profile.userId, {
                subscriptionStatus: 'inactive',
                subscriptionTier: 'free',
                profileType: 'general' as any,
              });
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Stripe webhook processing error:', e);
    }
    res.json({ received: true });
  });

  // ---- ADMIN STRIPE ROUTES ----
  app.post('/api/admin/stripe/activate-subscription', isAuthenticated, async (req: any, res) => {
    if (!(await isAdminUser(req.user.claims.sub))) return res.status(403).json({ message: "Forbidden" });
    const { userId, tier, status } = req.body;
    if (!userId || !tier) return res.status(400).json({ message: "userId and tier required." });
    const validTier = ['vendor_pro', 'event_owner_pro', 'free'].includes(tier) ? tier : 'free';
    const validStatus = status === 'active' ? 'active' : 'inactive';
    await storage.upsertUserProfile(userId, {
      subscriptionTier: validTier as any,
      subscriptionStatus: validStatus,
      profileType: (validStatus === 'active' ? tierToProfileType(validTier) : 'general') as any,
    });
    res.json({ success: true });
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

  // Open Graph meta tag injection for social link previews on event pages.
  // X, Facebook, and WhatsApp scrape the page URL server-side (no JS) and
  // read OG tags to build the link preview card shown in the compose window.
  // NOTE: Facebook's bot sends Accept: */* — do NOT filter on Accept header.
  app.get('/events/:id', async (req: any, res, next) => {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) return next();

    try {
      const result = await pool.query(
        `SELECT title, description, location, date, banner_url, area_code FROM events WHERE id = $1`,
        [eventId]
      );
      if (result.rows.length === 0) return next();

      const ev = result.rows[0];
      const siteUrl = 'https://www.vendorgrid.net';
      const eventUrl = `${siteUrl}/events/${eventId}`;
      const imageUrl = ev.banner_url ||
        `https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=1200&auto=format&fit=crop&sig=${eventId}`;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const evDate = ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
      const ogTitle = esc(`${ev.title} | VendorGrid`);
      const ogDesc = esc([ev.location, evDate].filter(Boolean).join(' \u2022 '));
      const ogImage = esc(imageUrl);
      const ogUrl = esc(eventUrl);

      const ogTags = `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="VendorGrid" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@VendorGrid" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    <meta name="twitter:image" content="${ogImage}" />`;

      let html: string;
      if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'public', 'index.html');
        html = fs.readFileSync(distPath, 'utf8');
      } else {
        const devPath = path.resolve(__dirname, '..', 'client', 'index.html');
        html = fs.readFileSync(devPath, 'utf8');
      }

      html = html.replace('</head>', `${ogTags}\n  </head>`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      next();
    }
  });

  return httpServer;
}
