import { useState } from "react";
import { useCreateEvent } from "@/hooks/use-events";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarDays, Store, MapPin, Plus, X, Users, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Provide a better description"),
  location: z.string().min(3, "Location is required"),
  areaCode: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  vendorSpaces: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddEvent() {
  const { isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const { mutate: createEvent, isPending } = useCreateEvent();
  const [, setLocation] = useLocation();
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      areaCode: profile?.areaCode || "",
      date: "",
      vendorSpaces: 0,
    },
  });

  const onSubmit = (data: FormValues) => {
    createEvent({
      ...data,
      date: new Date(data.date),
      extraDates,
    }, {
      onSuccess: (event: any) => setLocation(`/events/${event.id}`)
    });
  };

  const addExtraDate = () => {
    if (newDate && !extraDates.includes(newDate)) {
      setExtraDates([...extraDates, newDate]);
      setNewDate("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <Store className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Login Required</h2>
        <Button asChild size="lg" className="rounded-xl px-8 h-14 w-full"><a href="/api/login">Login to Continue</a></Button>
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
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Event Name</FormLabel>
                <FormControl><Input data-testid="input-event-title" placeholder="e.g. Downtown Summer Maker's Market" className="h-14 rounded-xl text-base" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Primary Date & Time</FormLabel>
                  <FormControl><Input data-testid="input-event-date" type="datetime-local" className="h-14 rounded-xl text-base" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Location</FormLabel>
                  <FormControl><Input data-testid="input-event-location" placeholder="e.g. City Central Park" className="h-14 rounded-xl text-base" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="areaCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2"><Hash className="w-4 h-4 text-primary" />Area Code / ZIP</FormLabel>
                  <FormControl><Input data-testid="input-event-area-code" placeholder="e.g. 90210" className="h-14 rounded-xl text-base" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="vendorSpaces" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Vendor Spaces Available</FormLabel>
                  <FormControl><Input data-testid="input-vendor-spaces" type="number" min="0" placeholder="e.g. 25" className="h-14 rounded-xl text-base" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Extra Dates */}
            <div className="space-y-3">
              <label className="text-base font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Additional Dates (Optional)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {extraDates.map((d, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-sm py-1.5 px-3">
                    {new Date(d).toLocaleString()}
                    <button type="button" onClick={() => setExtraDates(extraDates.filter((_, j) => j !== i))} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  data-testid="input-extra-date"
                  type="datetime-local"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="h-12 rounded-xl flex-1"
                />
                <Button type="button" variant="outline" onClick={addExtraDate} disabled={!newDate} className="rounded-xl h-12" data-testid="button-add-date">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Details & Guidelines</FormLabel>
                <FormControl>
                  <Textarea data-testid="input-event-description" placeholder="Tell vendors what to expect, setup times, or parking instructions..." className="min-h-[160px] rounded-xl text-base resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-amber-500 shadow-lg" disabled={isPending} data-testid="button-publish-event">
              {isPending ? "Creating Event..." : "Publish Event"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
