import { z } from 'zod';
import { insertEventSchema, insertVendorPostSchema, insertMessageSchema, insertUserProfileSchema, insertEventAttendanceSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const PRO_TIERS = {
  vendor_pro: { label: 'VendorGrid Pro', price: 1495, displayPrice: '$14.95' },
} as const;

export const api = {
  profile: {
    get: { method: 'GET' as const, path: '/api/profile' as const, responses: { 200: z.any() } },
    getById: { method: 'GET' as const, path: '/api/profile/:userId' as const, responses: { 200: z.any() } },
    upsert: { method: 'POST' as const, path: '/api/profile' as const, input: insertUserProfileSchema, responses: { 200: z.any() } },
    completeOnboarding: { method: 'POST' as const, path: '/api/profile/onboarding' as const, responses: { 200: z.any() } },
  },
  events: {
    list: { method: 'GET' as const, path: '/api/events' as const, responses: { 200: z.array(z.any()) } },
    get: { method: 'GET' as const, path: '/api/events/:id' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    create: { method: 'POST' as const, path: '/api/events' as const, input: insertEventSchema.extend({ date: z.coerce.date(), extraDates: z.array(z.string()).optional() }), responses: { 201: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/events/:id' as const, responses: { 204: z.void() } },
  },
  attendance: {
    setStatus: { method: 'POST' as const, path: '/api/events/:eventId/attendance' as const, input: z.object({ status: z.enum(['attending', 'interested']) }), responses: { 200: z.any() } },
    removeStatus: { method: 'DELETE' as const, path: '/api/events/:eventId/attendance' as const, responses: { 204: z.void() } },
  },
  vendorPosts: {
    listByEvent: { method: 'GET' as const, path: '/api/events/:eventId/posts' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/events/:eventId/posts' as const, input: insertVendorPostSchema.omit({ eventId: true }).extend({ imageUrl: z.string().optional() }), responses: { 201: z.any() } },
  },
  messages: {
    list: { method: 'GET' as const, path: '/api/messages' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/messages' as const, input: insertMessageSchema, responses: { 201: z.any() } },
  },
  notifications: {
    list: { method: 'GET' as const, path: '/api/notifications' as const, responses: { 200: z.array(z.any()) } },
    send: { method: 'POST' as const, path: '/api/notifications/send' as const, input: z.object({ eventId: z.number().optional(), title: z.string(), message: z.string() }), responses: { 200: z.any() } },
    markRead: { method: 'PATCH' as const, path: '/api/notifications/:id/read' as const, responses: { 200: z.any() } },
    markAllRead: { method: 'POST' as const, path: '/api/notifications/read-all' as const, responses: { 200: z.any() } },
    unreadCount: { method: 'GET' as const, path: '/api/notifications/unread-count' as const, responses: { 200: z.any() } },
  },
  eventMap: {
    get: { method: 'GET' as const, path: '/api/events/:id/map' as const, responses: { 200: z.any() } },
    save: { method: 'PUT' as const, path: '/api/events/:id/map' as const, input: z.object({ mapData: z.any() }), responses: { 200: z.any() } },
  },
  vendorRegistrations: {
    listByEvent: { method: 'GET' as const, path: '/api/events/:eventId/registrations' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/events/:eventId/register' as const, input: z.object({ spotId: z.string().optional(), spotName: z.string().optional() }), responses: { 200: z.any() } },
  },
  admin: {
    getSettings: { method: 'GET' as const, path: '/api/admin/settings' as const, responses: { 200: z.array(z.any()) } },
    upsertSetting: { method: 'POST' as const, path: '/api/admin/settings' as const, input: z.object({ key: z.string(), value: z.string() }), responses: { 200: z.any() } },
    getUsers: { method: 'GET' as const, path: '/api/admin/users' as const, responses: { 200: z.array(z.any()) } },
    setUserAdmin: { method: 'POST' as const, path: '/api/admin/users/:userId/admin' as const, input: z.object({ isAdmin: z.boolean() }), responses: { 200: z.any() } },
    deleteEvent: { method: 'DELETE' as const, path: '/api/admin/events/:id' as const, responses: { 204: z.void() } },
    getStats: { method: 'GET' as const, path: '/api/admin/stats' as const, responses: { 200: z.any() } },
    getEvents: { method: 'GET' as const, path: '/api/admin/events' as const, responses: { 200: z.array(z.any()) } },
    getRegistrations: { method: 'GET' as const, path: '/api/admin/registrations' as const, responses: { 200: z.array(z.any()) } },
    getAnalytics: { method: 'GET' as const, path: '/api/admin/analytics/:userId' as const, responses: { 200: z.any() } },
  },
  stripe: {
    subscriptionStatus: { method: 'GET' as const, path: '/api/stripe/subscription' as const, responses: { 200: z.any() } },
    checkout: { method: 'POST' as const, path: '/api/stripe/checkout' as const, responses: { 200: z.object({ url: z.string() }) } },
    manageSubscription: { method: 'POST' as const, path: '/api/stripe/portal' as const, responses: { 200: z.object({ url: z.string() }) } },
    acceptTerms: { method: 'POST' as const, path: '/api/stripe/terms-accept' as const, responses: { 200: z.any() } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
