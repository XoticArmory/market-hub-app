import { useState } from "react";
import { useUpsertProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Store, Package, Users, ArrowRight, Loader2, Crown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const TYPES = [
  {
    value: "event_owner",
    icon: Store,
    label: "Event Owner",
    desc: "I organize and host local markets, craft fairs, and pop-up events.",
    color: "from-primary to-amber-500",
    requiresPro: false,
  },
  {
    value: "vendor",
    icon: Package,
    label: "Vendor",
    desc: "I sell products, crafts, or food at local markets and events.",
    color: "from-blue-500 to-cyan-500",
    requiresPro: true,
  },
  {
    value: "general",
    icon: Users,
    label: "Community Member",
    desc: "I attend local markets to discover products and support artisans.",
    color: "from-purple-500 to-pink-500",
    requiresPro: false,
  },
];

export default function SetupPage() {
  const { user, isAuthenticated } = useAuth();
  const { mutate: upsertProfile } = useUpsertProfile();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(1);
  const [profileType, setProfileType] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/onboarding", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to complete onboarding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in first</h2>
          <Button asChild><a href="/auth">Login</a></Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!profileType) return;
    setIsSaving(true);
    await new Promise<void>(resolve => {
      upsertProfile({ profileType, areaCode: areaCode || undefined, bio: bio || undefined, businessName: businessName || undefined }, { onSettled: () => resolve() });
    });
    await completeOnboarding.mutateAsync();
    setIsSaving(false);
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <Store className="w-4 h-4" /> Welcome to VendorGrid
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">Set Up Your Account</h1>
          <p className="text-muted-foreground text-lg">Tell us how you'll be using the platform so we can personalize your experience.</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-foreground mb-6">What best describes you?</h2>
            {TYPES.map(({ value, icon: Icon, label, desc, color, requiresPro }) => (
              <button
                key={value}
                data-testid={`type-${value}`}
                onClick={() => setProfileType(value)}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg flex items-center gap-5 group ${
                  profileType === value ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-foreground">{label}</p>
                    {requiresPro && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        <Crown className="w-3 h-3" />Vendor Pro
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
                {profileType === value && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </button>
            ))}
            <Button
              className="w-full h-14 text-base rounded-2xl mt-6 bg-gradient-to-r from-primary to-amber-500"
              disabled={!profileType}
              onClick={() => {
                if (profileType === "vendor" || profileType === "event_owner") {
                  setLocation("/upgrade");
                } else {
                  setStep(2);
                }
              }}
              data-testid="button-next"
            >
              {(profileType === "vendor" || profileType === "event_owner") ? (
                <><Crown className="mr-2 w-5 h-5" />Subscribe to Get Started</>
              ) : (
                <>Continue <ArrowRight className="ml-2 w-5 h-5" /></>
              )}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-card rounded-3xl p-8 shadow-xl border border-border/50 space-y-6">
            <h2 className="text-2xl font-bold text-foreground">A little more about you</h2>
            <div>
              <label className="text-sm font-semibold mb-2 block">Area Code / ZIP Code</label>
              <Input
                data-testid="input-area-code"
                placeholder="e.g. 90210"
                value={areaCode}
                onChange={e => setAreaCode(e.target.value)}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">This helps us show you relevant local events and vendors.</p>
            </div>
            {(profileType === "event_owner" || profileType === "vendor") && (
              <div>
                <label className="text-sm font-semibold mb-2 block">Business / Market Name</label>
                <Input
                  data-testid="input-business"
                  placeholder={profileType === "event_owner" ? "e.g. Downtown Artisan Market" : "e.g. Handmade by Sarah"}
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold mb-2 block">Bio <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                data-testid="input-bio"
                placeholder="Tell the community about yourself..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="resize-none rounded-xl"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl h-12" onClick={() => setStep(1)}>Back</Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-amber-500"
                onClick={handleSave}
                disabled={isSaving}
                data-testid="button-complete"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</> : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
