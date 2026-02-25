import { z } from 'zod';
import { insertEventSchema, insertVendorPostSchema, insertMessageSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  events: {
    list: {
      method: 'GET' as const,
      path: '/api/events' as const,
      responses: {
        200: z.array(z.any()), // Returns EventResponse[]
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/events/:id' as const,
      responses: {
        200: z.any(), // Returns EventResponse
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/events' as const,
      input: insertEventSchema,
      responses: {
        201: z.any(), // Returns EventResponse
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  vendorPosts: {
    listByEvent: {
      method: 'GET' as const,
      path: '/api/events/:eventId/posts' as const,
      responses: {
        200: z.array(z.any()), // Returns VendorPostResponse[]
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/events/:eventId/posts' as const,
      input: insertVendorPostSchema.omit({ eventId: true }).extend({
        imageUrl: z.string().optional(),
      }),
      responses: {
        201: z.any(), // Returns VendorPostResponse
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/messages' as const,
      responses: {
        200: z.array(z.any()), // Returns MessageResponse[]
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/messages' as const,
      input: insertMessageSchema,
      responses: {
        201: z.any(), // Returns MessageResponse
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
