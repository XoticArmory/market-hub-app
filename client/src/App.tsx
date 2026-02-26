import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

import Home from "@/pages/home";
import EventDetail from "@/pages/event-detail";
import AddEvent from "@/pages/add-event";
import Chat from "@/pages/chat";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/events/new" component={AddEvent} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin" component={AdminPage} />
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
              <header className="md:hidden flex h-16 items-center px-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-20">
                <SidebarTrigger className="text-foreground" />
                <h1 className="ml-4 font-display font-semibold text-lg">Artisan Collective</h1>
              </header>
              <main className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="p-4 md:p-8 lg:p-12 h-full">
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
