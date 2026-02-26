import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // ---- PROFILE ROUTES ----
  app.get(api.profile.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const user = await authStorage.getUser(userId);
    const attendance = await storage.getUserAttendance(userId);
    res.json({ profile, user, attendance });
  });

  app.get(api.profile.getById.path, async (req, res) => {
    const { userId } = req.params;
    const profile = await storage.getUserProfile(userId);
    const user = await authStorage.getUser(userId);
    if (!profile && !user) return res.status(404).json({ message: "Profile not found" });
    // Get events this user attends or owns
    const attendance = await storage.getUserAttendance(userId);
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

  // ---- EVENT ROUTES ----
  app.get(api.events.list.path, async (req: any, res) => {
    const areaCode = req.query.areaCode as string | undefined;
    const allEvents = await storage.getEvents(areaCode);
    const enriched = await Promise.all(allEvents.map(async (e) => {
      const creator = await enrichUser(e.createdBy);
      const attendance = await storage.getEventAttendance(e.id);
      const extraDates = await storage.getEventDates(e.id);
      const attendingCount = attendance.filter(a => a.status === 'attending').length;
      const interestedCount = attendance.filter(a => a.status === 'interested').length;
      let userStatus: string | null = null;
      if (req.user) {
        userStatus = await storage.getUserStatusForEvent(e.id, req.user.claims?.sub);
      }
      return { ...e, creatorName: creator.name, extraDates, attendingCount, interestedCount, userStatus };
    }));
    res.json(enriched);
  });

  app.get(api.events.get.path, async (req: any, res) => {
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const creator = await enrichUser(event.createdBy);
    const attendance = await storage.getEventAttendance(eventId);
    const extraDates = await storage.getEventDates(eventId);
    const attendingCount = attendance.filter(a => a.status === 'attending').length;
    const interestedCount = attendance.filter(a => a.status === 'interested').length;
    let userStatus: string | null = null;
    if (req.user) {
      userStatus = await storage.getUserStatusForEvent(eventId, req.user.claims?.sub);
    }
    const vendorPosts = await storage.getVendorPosts(eventId);
    const vendorAttendees = await Promise.all(vendorPosts.map(async (p) => {
      const u = await enrichUser(p.vendorId);
      return { ...p, vendorName: u.name, vendorAvatar: u.avatar };
    }));
    res.json({ ...event, creatorName: creator.name, extraDates, attendingCount, interestedCount, userStatus, vendorAttendees });
  });

  app.post(api.events.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check if user is event_owner and has active subscription
      const profile = await storage.getUserProfile(userId);
      if (profile?.profileType === 'event_owner' && profile?.subscriptionStatus !== 'active') {
        return res.status(403).json({ message: "Active subscription required to post events." });
      }
      const input = api.events.create.input.parse(req.body);
      const { extraDates, ...eventData } = input;
      const created = await storage.createEvent({
        ...eventData,
        date: new Date(eventData.date),
        createdBy: userId,
      });
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

  // ---- ATTENDANCE ROUTES ----
  app.post(api.attendance.setStatus.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = Number(req.params.eventId);
      const { status } = api.attendance.setStatus.input.parse(req.body);
      const existing = await storage.getUserStatusForEvent(eventId, userId);
      const result = await storage.setAttendance(eventId, userId, status);
      // Update vendor space count
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

  // Promote self to admin via env var ADMIN_EMAILS
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
    res.json({ status: profile?.subscriptionStatus || 'inactive', subscriptionId: profile?.stripeSubscriptionId });
  });

  app.post(api.stripe.createCheckout.path, isAuthenticated, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured. Ask the admin to set up payments." });
    const userId = req.user.claims.sub;
    const user = await authStorage.getUser(userId);
    const priceId = await storage.getAdminSetting('stripe_price_id');
    if (!priceId) return res.status(503).json({ message: "Subscription price not configured yet. Contact admin." });
    const profile = await storage.getUserProfile(userId);
    let customerId = profile?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user?.email || undefined, metadata: { userId } });
      customerId = customer.id;
      await storage.upsertUserProfile(userId, { stripeCustomerId: customerId });
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${getHost(req)}/profile?subscribed=1`,
      cancel_url: `${getHost(req)}/profile?canceled=1`,
    });
    res.json({ url: session.url });
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

  // Stripe webhook
  app.post('/api/stripe/webhook', async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).end();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      const sig = req.headers['stripe-signature'] as string;
      event = webhookSecret
        ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
        : JSON.parse(req.body.toString());
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
    const getCustomerProfile = async (customerId: string) => {
      const profiles = await storage.getAllUserProfiles();
      return profiles.find(p => p.stripeCustomerId === customerId);
    };
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
        await storage.upsertUserProfile(profile.userId, { subscriptionStatus: 'canceled' });
      }
    }
    res.json({ received: true });
  });

  return httpServer;
}
