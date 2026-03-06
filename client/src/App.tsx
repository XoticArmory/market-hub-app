import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect, useState } from "react";
import { Bell, Lightbulb, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

function FeedbackButton() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => { setSubject(""); setMessage(""); setSubmitted(false); }, 300);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        title="Send a suggestion"
        data-testid="button-feedback"
      >
        <Lightbulb className="w-5 h-5 text-foreground" />
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Share an Idea
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Thank you!</p>
                <p className="text-sm text-muted-foreground mt-1">Your suggestion has been sent to the team. We read every one.</p>
              </div>
              <Button onClick={handleClose} className="rounded-xl mt-2" data-testid="button-feedback-close">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Have an idea to make Artisan Collective better? We'd love to hear it.</p>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Subject</label>
                <Input
                  placeholder="e.g. Add a dark mode toggle"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="rounded-xl"
                  data-testid="input-feedback-subject"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Your Suggestion</label>
                <Textarea
                  placeholder="Describe your idea or improvement..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={4}
                  data-testid="input-feedback-message"
                />
              </div>
              {submit.isError && (
                <p className="text-sm text-destructive">{(submit.error as any)?.message || "Something went wrong."}</p>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="rounded-xl flex-1" onClick={handleClose}>Cancel</Button>
                <Button
                  className="rounded-xl flex-1 bg-gradient-to-r from-primary to-amber-500"
                  disabled={!subject.trim() || !message.trim() || submit.isPending}
                  onClick={() => submit.mutate()}
                  data-testid="button-feedback-submit"
                >
                  {submit.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
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
                <div className="flex items-center gap-1">
                  <FeedbackButton />
                  <NotificationBell />
                </div>
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
