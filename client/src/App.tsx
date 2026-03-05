import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";

import Home from "@/pages/home";
import EventDetail from "@/pages/event-detail";
import AddEvent from "@/pages/add-event";
import Chat from "@/pages/chat";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import SetupPage from "@/pages/setup";
import UpgradePage from "@/pages/upgrade";
import NotFound from "@/pages/not-found";

import { useProfile } from "@/hooks/use-profile";

function OnboardingGuard() {
  const { isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (location === "/setup" || location.startsWith("/api")) return;
    const profileLoaded = profileData !== undefined;
    if (!profileLoaded) return;
    const profile = profileData?.profile;
    if (!profile || !profile.onboardingComplete) {
      setLocation("/setup");
    }
  }, [isAuthenticated, profileData, location]);

  return null;
}

function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const count = unreadData?.count || 0;

  if (!isAuthenticated) return null;

  return (
    <Link
      href="/profile?tab=notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
      data-testid="link-notifications-bell"
    >
      <Bell className="w-5 h-5 text-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none" data-testid="badge-unread-count">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/events/new" component={AddEvent} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/setup" component={SetupPage} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden relative">
              <header className="flex h-14 items-center px-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-20 justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-foreground" />
                  <h1 className="md:hidden font-display font-semibold text-lg">Artisan Collective</h1>
                </div>
                <NotificationBell />
              </header>
              <main className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="p-4 md:p-8 lg:p-12 h-full">
                  <OnboardingGuard />
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
