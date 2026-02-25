import { useEvents } from "@/hooks/use-events";
import { Link } from "wouter";
import { Calendar, MapPin, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Home() {
  const { data: events, isLoading } = useEvents();

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass-panel">
        {/* artisan market colorful crafts */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop" 
            alt="Artisan Market" 
            className="w-full h-full object-cover opacity-20 dark:opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:w-2/3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 w-fit border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>Support Local Creators</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
            Discover & Connect with Local Markets
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
            See what vendors are bringing to upcoming events, claim your spot, and chat with fellow artisans in your community.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/events/new" 
              className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              Host an Event
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/chat" 
              className="px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all duration-200"
            >
              Join the Chat
            </Link>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Upcoming Markets</h2>
            <p className="text-muted-foreground mt-2">Find out where the community is gathering next.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p>Loading market events...</p>
          </div>
        ) : events?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No events scheduled</h3>
            <p className="text-muted-foreground mb-6">Be the first to add a local market event to the board.</p>
            <Link href="/events/new" className="text-primary font-medium hover:underline">
              Create an event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events?.map((event, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                key={event.id}
              >
                <Link 
                  href={`/events/${event.id}`}
                  className="group block h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className="h-48 bg-muted relative overflow-hidden">
                    {/* market stall fresh produce or crafts */}
                    <img 
                      src={`https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop&sig=${event.id}`} 
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur text-foreground px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex flex-col items-center">
                      <span className="text-primary">{format(new Date(event.date), 'MMM')}</span>
                      <span className="text-xl leading-none">{format(new Date(event.date), 'dd')}</span>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex items-start gap-2 text-muted-foreground text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
                        <span className="line-clamp-2">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4 shrink-0 text-primary/70" />
                        <span>{format(new Date(event.date), 'EEEE, h:mm a')}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-muted-foreground">
                        Added by {event.creatorName || 'Community'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
