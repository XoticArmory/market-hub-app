import { useCreateEvent } from "@/hooks/use-events";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarDays, Store, MapPin } from "lucide-react";

// Matches insertEventSchema but handles HTML datetime-local string format
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Provide a better description"),
  location: z.string().min(3, "Location is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddEvent() {
  const { isAuthenticated } = useAuth();
  const { mutate: createEvent, isPending } = useCreateEvent();
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    createEvent({
      ...data,
      date: new Date(data.date), // Convert string back to Date for the schema
    }, {
      onSuccess: (event) => {
        setLocation(`/events/${event.id}`);
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <Store className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Vendor Access Required</h2>
        <p className="text-muted-foreground mb-8">You need to be logged in to create and host new market events for the community.</p>
        <Button asChild size="lg" className="rounded-xl px-8 h-14 text-base w-full">
          <a href="/api/login">Login to Continue</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">Host a Market</h1>
        <p className="text-lg text-muted-foreground">Add a new pop-up, craft fair, or farmers market to the community board.</p>
      </div>

      <div className="bg-card rounded-3xl p-8 shadow-xl border border-border/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Event Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Downtown Summer Maker's Market" 
                      className="h-14 rounded-xl text-base bg-background/50 focus:bg-background transition-colors"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      Date & Time
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        className="h-14 rounded-xl text-base bg-background/50 focus:bg-background transition-colors"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. City Central Park" 
                        className="h-14 rounded-xl text-base bg-background/50 focus:bg-background transition-colors"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Details & Guidelines</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell vendors what to expect, setup times, or parking instructions..." 
                      className="min-h-[160px] rounded-xl text-base resize-none bg-background/50 focus:bg-background transition-colors"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-amber-500 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              disabled={isPending}
            >
              {isPending ? "Creating Event..." : "Publish Event"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
