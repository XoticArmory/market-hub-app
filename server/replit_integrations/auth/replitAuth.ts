import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { createClient } from "@supabase/supabase-js";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || `https://${process.env.SUPABASE_DATABASE_URL?.match(/\.([^.]+)\.supabase\./)?.[1] || 'yyjvtrcknlcnvocwjonx'}.supabase.co`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  (req as any).user = { claims: { sub: userId } };
  return next();
};
