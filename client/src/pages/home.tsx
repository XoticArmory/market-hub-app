import { useState } from "react";
import { useEvents } from "@/hooks/use-events";
import { Link } from "wouter";
import { Calendar, MapPin, ArrowRight, Loader2, Sparkles, Package, Users, Image as ImageIcon, Filter, Hash } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [areaInput, setAreaInput] = useState("");
  const [areaFilter, setAreaFilter] = useState<string | undefined>(undefined);
  const { data: events, isLoading: isLoadingEvents } = useEvents(areaFilter);

  const postQueries = useQueries({
    queries: (events || []).map((event) => ({
      queryKey: ["/api/events", event.id, "posts"],
      queryFn: async () => {
        const res = await fetch(`/api/events/${event.id}/posts`);
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!events,
    })),
  });

  const isLoadingPosts = postQueries.some((q) => q.isLoading);
  const allPosts = postQueries.flatMap((q) => q.data || []);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden glass-panel">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop" alt="Artisan Market" className="w-full h-full object-cover opacity-20 dark:opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        </div>
        <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:w-2/3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 w-fit border border-primary/20">
            <Sparkles className="w-4 h-4" /><span>Support Local Creators</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">Discover & Connect with Local Markets</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">See what vendors are bringing to upcoming events, claim your spot, and chat with fellow artisans in your community.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/events/new" className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
              Host an Event <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/chat" className="px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all duration-200">
              Join the Chat
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="markets" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Community Board</h2>
            <p className="text-muted-foreground mt-2">Explore registered markets and vendor collections.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Hash className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  data-testid="input-area-filter"
                  placeholder="Filter by area code..."
                  value={areaInput}
                  onChange={e => setAreaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setAreaFilter(areaInput || undefined); }}
                  className="pl-9 rounded-xl h-10 w-48 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => setAreaFilter(areaInput || undefined)} className="rounded-xl h-10" data-testid="button-filter">
                <Filter className="w-4 h-4" />
              </Button>
              {areaFilter && (
                <Button size="sm" variant="ghost" onClick={() => { setAreaFilter(undefined); setAreaInput(""); }} className="rounded-xl h-10 text-muted-foreground text-sm">
                  Clear
                </Button>
              )}
            </div>
            <TabsList className="bg-muted/50 p-1 rounded-xl h-10 w-fit">
              <TabsTrigger value="markets" className="rounded-lg px-5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5" />Markets
              </TabsTrigger>
              <TabsTrigger value="items" className="rounded-lg px-5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-sm">
                <ImageIcon className="w-3.5 h-3.5" />Community Items
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="markets" className="mt-0">
          {areaFilter && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-sm py-1.5 px-3"><Hash className="w-3 h-3 mr-1" />Area: {areaFilter}</Badge>
            </div>
          )}
          {isLoadingEvents ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" /><p>Loading markets...</p>
            </div>
          ) : events?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{areaFilter ? `No events in area ${areaFilter}` : "No events scheduled"}</h3>
              <p className="text-muted-foreground mb-6">Be the first to add a local market event to the board.</p>
              <Link href="/events/new" className="text-primary font-medium hover:underline">Create an event</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events?.map((event, i) => {
                const eventPosts = postQueries[i]?.data || [];
                const uniqueVendors = Array.from(new Set(eventPosts.map((p: any) => p.vendorId)));
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }} key={event.id}>
                    <Link href={`/events/${event.id}`} className="group block h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      <div className="h-48 bg-muted relative overflow-hidden">
                        <img src={`https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop&sig=${event.id}`} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur text-foreground px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex flex-col items-center">
                          <span className="text-primary">{format(new Date(event.date), 'MMM')}</span>
                          <span className="text-xl leading-none">{format(new Date(event.date), 'dd')}</span>
                        </div>
                        {event.areaCode && (
                          <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-semibold text-foreground flex items-center gap-1">
                            <Hash className="w-3 h-3" />{event.areaCode}
                          </div>
                        )}
                        {uniqueVendors.length > 0 && (
                          <div className="absolute bottom-4 left-4 flex -space-x-2">
                            {eventPosts.slice(0, 3).map((post: any) => (
                              <Avatar key={post.id} className="w-8 h-8 border-2 border-background ring-2 ring-primary/20">
                                <AvatarImage src={post.vendorAvatar || ""} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{post.vendorName?.charAt(0) || "V"}</AvatarFallback>
                              </Avatar>
                            ))}
                            {uniqueVendors.length > 3 && <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{uniqueVendors.length - 3}</div>}
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
                        <div className="space-y-2 mb-4 flex-1">
                          <div className="flex items-start gap-2 text-muted-foreground text-sm">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" /><span className="line-clamp-2">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Users className="w-4 h-4 shrink-0 text-primary/70" />
                            <span>{event.attendingCount || 0} attending · {event.interestedCount || 0} interested</span>
                          </div>
                          {(event.vendorSpaces || 0) > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Package className="w-4 h-4 shrink-0 text-primary/70" />
                              <span>{(event.vendorSpaces || 0) - (event.vendorSpacesUsed || 0)} vendor spaces remaining</span>
                            </div>
                          )}
                        </div>
                        <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-auto">
                          <span className="text-sm font-medium text-muted-foreground">{eventPosts.length} items listed</span>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-0">
          {isLoadingPosts ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : allPosts.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No items posted by vendors yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allPosts.map((post: any) => (
                <Link href={`/events/${post.eventId}`} key={post.id}>
                  <div className="group bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="aspect-square bg-muted relative">
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt={post.vendorName || "Vendor item"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                          <Package className="w-10 h-10 mb-2" /><span className="text-xs uppercase tracking-tighter">No Photo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                        <p className="text-white text-xs font-medium line-clamp-1">{post.vendorName}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-foreground font-medium line-clamp-2 min-h-[2.5rem]">{post.itemsDescription}</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-3">{events?.find((e: any) => e.id === post.eventId)?.title || "Event"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
