import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated, getSupabaseAdmin } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/exchange", async (req: any, res) => {
    try {
      const { access_token } = req.body;
      if (!access_token) return res.status(400).json({ message: "access_token required" });

      const supabase = getSupabaseAdmin();
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(access_token);
      if (error || !supabaseUser) return res.status(401).json({ message: "Invalid token" });

      const email = supabaseUser.email;
      let user = email ? await authStorage.getUserByEmail(email) : null;

      if (!user) {
        const meta = supabaseUser.user_metadata || {};
        user = await authStorage.upsertUser({
          id: supabaseUser.id,
          email,
          firstName: meta.first_name || meta.full_name?.split(" ")[0] || email?.split("@")[0] || "User",
          lastName: meta.last_name || meta.full_name?.split(" ").slice(1).join(" ") || null,
          profileImageUrl: meta.avatar_url || null,
        });
      }

      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl });
    } catch (error) {
      console.error("Auth exchange error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });
}
