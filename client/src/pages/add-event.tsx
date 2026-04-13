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
import { CalendarDays, Store, MapPin, Plus, X, Users, Hash, Globe, LayoutGrid, Crown, DollarSign, Key, ClipboardList, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Provide a better description"),
  location: z.string().min(3, "Location is required"),
  areaCode: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  vendorSpaces: z.coerce.number().min(0).default(0),
  spotPrice: z.coerce.number().min(0).default(0),
  contactEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  registrationCode: z.string().optional(),
  vendorRegistrationType: z.enum(["vendorgrid", "external", "form", "email"]).optional(),
  vendorRegistrationUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.vendorRegistrationType === "external" && !data.vendorRegistrationUrl?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter your market website URL", path: ["vendorRegistrationUrl"] });
  }
  if (data.vendorRegistrationType === "form" && !data.vendorRegistrationUrl?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter the application form URL", path: ["vendorRegistrationUrl"] });
  }
  if (data.vendorRegistrationType === "email" && !data.vendorRegistrationUrl?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter the email address vendors should contact", path: ["vendorRegistrationUrl"] });
  }
  if (data.vendorRegistrationType === "email" && data.vendorRegistrationUrl?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.vendorRegistrationUrl.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter a valid email address", path: ["vendorRegistrationUrl"] });
  }
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

  const isEventOwnerPro = profile?.isAdmin === true || ((profile?.subscriptionTier === "vendor_pro" || profile?.subscriptionTier === "event_owner_pro") && profile?.subscriptionStatus === "active");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      areaCode: profile?.areaCode || "",
      date: "",
      vendorSpaces: 0,
      spotPrice: 0,
      contactEmail: "",
      registrationCode: "",
      vendorRegistrationType: undefined,
      vendorRegistrationUrl: "",
    },
  });

  const registrationType = form.watch("vendorRegistrationType");

  const onSubmit = (data: FormValues) => {
    createEvent({
      ...data,
      date: new Date(data.date),
      spotPrice: Math.round((data.spotPrice || 0) * 100),
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
        <Button asChild size="lg" className="rounded-xl px-8 h-14 w-full"><a href="/auth">Login to Continue</a></Button>
      </div>
    );
  }

  if (!isEventOwnerPro) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <Crown className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-3">VendorGrid Pro Required</h2>
        <p className="text-muted-foreground mb-8">Hosting market events requires a VendorGrid Pro subscription. Upgrade to start listing your events on VendorGrid.</p>
        <Button asChild size="lg" className="rounded-xl px-8 h-14 w-full bg-gradient-to-r from-amber-500 to-primary" data-testid="button-upgrade-to-host">
          <a href="/upgrade">Upgrade to VendorGrid Pro</a>
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

            {/* Contact Email — available to all event owners */}
            <FormField control={form.control} name="contactEmail" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />Contact Email <span className="text-muted-foreground font-normal">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    data-testid="input-contact-email"
                    type="email"
                    placeholder="yourname@email.com"
                    className="h-14 rounded-xl text-base"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Shown on your event card so anyone can email you directly with questions.</p>
                <FormMessage />
              </FormItem>
            )} />

            {/* Vendor Registration Method — Event Owner Pro only */}
            {isEventOwnerPro && (
              <FormField control={form.control} name="vendorRegistrationType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    How should vendors register?
                  </FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      data-testid="option-register-vendorgrid"
                      onClick={() => { field.onChange("vendorgrid"); form.setValue("vendorRegistrationUrl", ""); }}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${field.value === "vendorgrid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background"}`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${field.value === "vendorgrid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">Register through VendorGrid</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Vendors sign up directly on this platform</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="option-register-external"
                      onClick={() => field.onChange("external")}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${field.value === "external" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background"}`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${field.value === "external" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">Link to market website</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Send vendors to your own registration page</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="option-register-form"
                      onClick={() => field.onChange("form")}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${field.value === "form" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background"}`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${field.value === "form" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">Application form + approval</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Vendors apply via your form and await your approval</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="option-register-email"
                      onClick={() => { field.onChange("email"); form.setValue("vendorRegistrationUrl", ""); }}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${field.value === "email" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background"}`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${field.value === "email" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">Register via email</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Vendors email you directly to apply for a space</p>
                      </div>
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Spot Price — only if "vendorgrid" chosen */}
            {isEventOwnerPro && registrationType === "vendorgrid" && (
              <FormField control={form.control} name="spotPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />Registration Fee per Space
                  </FormLabel>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <FormControl>
                      <Input
                        data-testid="input-spot-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-14 rounded-xl text-base pl-8"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <p className="text-xs text-muted-foreground">Set to 0 for free registration. Vendors pay this when reserving their space.</p>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Registration Code — only if "vendorgrid" chosen */}
            {isEventOwnerPro && registrationType === "vendorgrid" && (
              <FormField control={form.control} name="registrationCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />Offline Registration Code <span className="text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-registration-code"
                      placeholder="e.g. MARKET2026"
                      className="h-14 rounded-xl text-base uppercase"
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Share this code with vendors who paid outside VendorGrid so they can register for free.</p>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Registration URL — shown for "external" or "form" */}
            {isEventOwnerPro && registrationType === "email" && (
              <FormField control={form.control} name="vendorRegistrationUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />Contact Email for Applications
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-registration-email"
                      type="email"
                      placeholder="you@yourmarket.com"
                      className="h-14 rounded-xl text-base"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Vendors will be shown this email to contact you directly. It will be displayed as a copy-to-clipboard prompt.</p>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {isEventOwnerPro && (registrationType === "external" || registrationType === "form") && (
              <FormField control={form.control} name="vendorRegistrationUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    {registrationType === "form" ? <ClipboardList className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                    {registrationType === "form" ? "Application Form URL" : "Market Website / Registration URL"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-registration-url"
                      placeholder={registrationType === "form" ? "https://forms.google.com/..." : "https://yourmarket.com/register"}
                      className="h-14 rounded-xl text-base"
                      {...field}
                    />
                  </FormControl>
                  {registrationType === "form" && (
                    <p className="text-xs text-muted-foreground">Vendors will be linked to this form before submitting their application on VendorGrid.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            )}

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
