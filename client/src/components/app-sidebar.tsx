import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, MessageCircle, PlusCircle, Store, LogIn, LogOut, User, ShieldCheck, Crown, Bell, Eye, X, Mail, Loader2, Send } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useRealProfile } from "@/hooks/use-profile";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useAdminPreview } from "@/contexts/admin-preview";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TIER_LABELS: Record<string, string> = {
  event_owner_pro: "VendorGrid Pro",
  vendor_pro: "VendorGrid Pro",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profileData } = useProfile();
  const { data: realProfileData } = useRealProfile();
  const { data: unreadData } = useUnreadCount();
  const { previewTier, setPreviewTier } = useAdminPreview();
  const { toast } = useToast();
  const profile = profileData?.profile;
  const realProfile = realProfileData?.profile;
  const isAdmin = realProfile?.isAdmin === true;
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier && profile.subscriptionTier !== "free";
  const isEventOwnerPro = isAdmin || ((profile?.subscriptionTier === "vendor_pro" || profile?.subscriptionTier === "event_owner_pro") && profile?.subscriptionStatus === "active");
  const unreadCount = unreadData?.count || 0;

  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });

  const { mutate: sendContact, isPending: isSending } = useMutation({
    mutationFn: () => apiRequest("POST", "/api/contact", { subject: contactForm.subject, message: contactForm.message }),
    onSuccess: () => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setContactOpen(false);
      setContactForm({ subject: "", message: "" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to send", description: e.message || "Please try again.", variant: "destructive" });
    },
  });

  const previewLabel: Record<string, string> = { admin: "Admin", vendor_pro: "Pro user", free: "Free user" };

  const navItems = [
    { title: "Market Events", url: "/", icon: CalendarDays },
    { title: "Community Chat", url: "/chat", icon: MessageCircle },
    ...(isEventOwnerPro ? [{ title: "Add Event", url: "/events/new", icon: PlusCircle }] : []),
  ];

  return (
    <>
      <Sidebar className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
        <SidebarContent>
          <div className="flex items-center gap-3 p-6 mb-2">
            <div className="bg-primary/20 p-2 rounded-xl text-primary">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight text-foreground">Vendor</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Grid</p>
            </div>
          </div>

          {isAdmin && previewTier && (
            <div className="mx-4 mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-xs font-medium px-3 py-2 rounded-xl">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">Preview: <span className="font-semibold">{previewLabel[previewTier]}</span></span>
              <button
                onClick={() => setPreviewTier(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                title="Exit preview mode"
                data-testid="button-exit-preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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

                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="mb-1 transition-all duration-200 hover:bg-primary/10 hover:text-primary cursor-pointer"
                    onClick={() => {
                      if (!isAuthenticated) { window.location.href = "/auth"; return; }
                      setContactOpen(true);
                    }}
                    data-testid="button-contact-us"
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full">
                      <Mail className="w-5 h-5" /><span className="font-medium">Contact Us</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
            <a href="/auth" className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200" data-testid="link-login">
              <LogIn className="w-4 h-4" /><span>Sign In</span>
            </a>
          )}
        </SidebarFooter>
      </Sidebar>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Contact Us</DialogTitle>
            <DialogDescription>Send a message directly to the VendorGrid team. We'll respond via your profile notifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Subject</label>
              <Input
                placeholder="What's this about?"
                value={contactForm.subject}
                onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))}
                className="rounded-xl"
                data-testid="input-contact-subject"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Message</label>
              <Textarea
                placeholder="Tell us how we can help..."
                value={contactForm.message}
                onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                className="rounded-xl min-h-[120px] resize-none"
                data-testid="input-contact-message"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setContactOpen(false)} disabled={isSending} data-testid="button-contact-cancel">
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={!contactForm.subject.trim() || !contactForm.message.trim() || isSending}
              onClick={() => sendContact()}
              data-testid="button-contact-send"
            >
              {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Message</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
