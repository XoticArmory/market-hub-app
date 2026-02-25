import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.events.list.path, async (req, res) => {
    const allEvents = await storage.getEvents();
    const enrichedEvents = await Promise.all(allEvents.map(async (e) => {
      const user = await authStorage.getUser(e.createdBy);
      return { ...e, creatorName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email };
    }));
    res.json(enrichedEvents);
  });

  app.get(api.events.get.path, async (req, res) => {
    const eventId = Number(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const user = await authStorage.getUser(event.createdBy);
    res.json({ ...event, creatorName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email });
  });

  app.post(api.events.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.events.create.input.parse(req.body);
      const user = req.user as any;
      const created = await storage.createEvent({
        ...input,
        date: new Date(input.date),
        createdBy: user.claims.sub,
      });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message, field: e.errors[0].path.join('.') });
      }
      throw e;
    }
  });

  app.get(api.vendorPosts.listByEvent.path, async (req, res) => {
    const eventId = Number(req.params.eventId);
    const posts = await storage.getVendorPosts(eventId);
    const enriched = await Promise.all(posts.map(async (p) => {
      const u = await authStorage.getUser(p.vendorId);
      return { ...p, vendorName: u?.firstName ? `${u.firstName} ${u.lastName || ''}` : u?.email, vendorAvatar: u?.profileImageUrl };
    }));
    res.json(enriched);
  });

  app.post(api.vendorPosts.create.path, isAuthenticated, async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const input = api.vendorPosts.create.input.parse(req.body);
      const user = req.user as any;
      const created = await storage.createVendorPost({
        ...input,
        eventId,
        vendorId: user.claims.sub,
      });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message });
      }
      throw e;
    }
  });

  app.get(api.messages.list.path, async (req, res) => {
    const msgs = await storage.getMessages();
    const enriched = await Promise.all(msgs.map(async (m) => {
      const u = await authStorage.getUser(m.senderId);
      return { ...m, senderName: u?.firstName ? `${u.firstName} ${u.lastName || ''}` : u?.email, senderAvatar: u?.profileImageUrl };
    }));
    res.json(enriched.reverse()); // return chronological
  });

  app.post(api.messages.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      const user = req.user as any;
      const created = await storage.createMessage({
        ...input,
        senderId: user.claims.sub,
      });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message });
      }
      throw e;
    }
  });

  return httpServer;
}
