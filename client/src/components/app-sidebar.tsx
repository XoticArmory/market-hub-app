import { Link, useLocation } from "wouter";
import { CalendarDays, MessageCircle, PlusCircle, Store, LogIn, LogOut, User, ShieldCheck, Crown, Bell } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useUnreadCount } from "@/hooks/use-notifications";

const TIER_LABELS: Record<string, string> = {
  event_owner_pro: "Event Owner Pro",
  vendor_pro: "Vendor Pro",
  general_pro: "General Pro",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profileData } = useProfile();
  const { data: unreadData } = useUnreadCount();
  const profile = profileData?.profile;
  const isAdmin = profile?.isAdmin === true;
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier && profile.subscriptionTier !== "free";
  const unreadCount = unreadData?.count || 0;

  const addEventUrl = "/events/new";

  const navItems = [
    { title: "Market Events", url: "/", icon: CalendarDays },
    { title: "Community Chat", url: "/chat", icon: MessageCircle },
    { title: "Add Event", url: addEventUrl, icon: PlusCircle },
  ];

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarContent>
        <div className="flex items-center gap-3 p-6 mb-2">
          <div className="bg-primary/20 p-2 rounded-xl text-primary">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg leading-tight text-foreground">Artisan</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Collective</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === "/" ? location === "/" : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className={`mb-1 transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'hover:bg-primary/10 hover:text-primary'}`}>
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                        <item.icon className="w-5 h-5" /><span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/profile"} className={`mb-1 transition-all duration-200 ${location === "/profile" ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10 hover:text-primary'}`}>
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg" data-testid="link-profile">
                      <div className="relative">
                        <User className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">My Profile</span>
                      {unreadCount > 0 && <Badge className="ml-auto h-5 text-[10px] bg-destructive">{unreadCount}</Badge>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {!hasActivePro && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/upgrade"} className={`mb-1 transition-all duration-200 ${location === "/upgrade" ? 'bg-amber-500 text-white' : 'hover:bg-amber-500/10 hover:text-amber-600'}`}>
                      <Link href="/upgrade" className="flex items-center gap-3 px-3 py-2.5 rounded-lg" data-testid="link-upgrade">
                        <Crown className="w-5 h-5" /><span className="font-medium">Upgrade to Pro</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {hasActivePro && (
                  <SidebarMenuItem>
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{TIER_LABELS[profile?.subscriptionTier || ''] || 'Pro'}</span>
                    </div>
                  </SidebarMenuItem>
                )}

                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/admin"} className={`mb-1 transition-all duration-200 ${location === "/admin" ? 'bg-amber-500 text-white' : 'hover:bg-amber-500/10 hover:text-amber-600'}`}>
                      <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg" data-testid="link-admin">
                        <ShieldCheck className="w-5 h-5" /><span className="font-medium">Admin Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/50 shadow-sm">
            <Link href="/profile" className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
              <Avatar className="w-9 h-9 border border-primary/20 shrink-0">
                <AvatarImage src={user.profileImageUrl || ""} alt={user.firstName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary"><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-sm font-semibold truncate">{user.firstName} {user.lastName}</span>
                <span className="text-xs text-muted-foreground truncate capitalize">
                  {hasActivePro ? TIER_LABELS[profile?.subscriptionTier || ''] || 'Pro' : profile?.profileType?.replace("_", " ") || "Member"}
                </span>
              </div>
            </Link>
            <button onClick={() => logout()} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 shrink-0" title="Logout" data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <a href="/api/login" className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200" data-testid="link-login">
            <LogIn className="w-4 h-4" /><span>Sign In</span>
          </a>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
