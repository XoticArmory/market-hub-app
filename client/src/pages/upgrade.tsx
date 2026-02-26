import { useState } from "react";
import { useUpgradeCheckout } from "@/hooks/use-upgrade";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { usePortalSession } from "@/hooks/use-stripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, Store, Package, Users, Zap, Bell, BarChart3, Map, Star, Crown, ArrowRight, X } from "lucide-react";
import { useLocation } from "wouter";

const TERMS = `ARTISAN COLLECTIVE PRO — SUBSCRIPTION TERMS OF SERVICE

Last updated: February 2026

By subscribing to an Artisan Collective Pro plan, you agree to the following terms:

1. SUBSCRIPTION & BILLING
Your Pro subscription is billed monthly on a recurring basis. You authorize us to charge your payment method each billing period. Prices are as displayed at the time of purchase.

2. CANCELLATION
You may cancel your subscription at any time through your Profile > Billing page. Upon cancellation, you retain Pro access through the end of your current billing period. No partial-period refunds are issued.

3. AUTO-RENEWAL
Subscriptions automatically renew unless canceled before the renewal date. You will receive no separate reminder; it is your responsibility to cancel if you do not wish to renew.

4. FREE TRIAL / REFUNDS
There are no free trials. All sales are final except where required by law.

5. FEATURE ACCESS
Pro features are tied to an active, paid subscription. Features may be modified or discontinued with 30 days' notice where reasonably possible.

6. ACCEPTABLE USE
Pro features, including push notifications (Event Owner Pro), must only be used to contact users who have opted in by registering on the platform. Spam or harassment violates these terms and may result in account termination without refund.

7. PLATFORM FEE
Non-Vendor Pro vendors registering for event spaces are charged a 0.5% platform fee in addition to the event owner's posted space price.

8. GOVERNING LAW
These terms are governed by the laws of the jurisdiction in which the platform is operated.

By clicking "Accept & Subscribe", you confirm you have read, understood, and agree to these terms.`;

const TIERS = [
  {
    id: "event_owner_pro",
    label: "Event Owner Pro",
    price: "$19.95",
    period: "/month",
    icon: Store,
    color: "from-primary to-amber-500",
    badge: "Most Popular",
    features: [
      "Post unlimited events",
      "Featured placement at top of community board",
      "Push notifications to local Vendor Pro accounts",
      "Event analytics dashboard",
      "Interactive event map builder",
      "Vendor space registration & payment collection",
      "Priority support",
    ],
  },
  {
    id: "vendor_pro",
    label: "Vendor Pro",
    price: "$9.95",
    period: "/month",
    icon: Package,
    color: "from-blue-500 to-cyan-500",
    badge: null,
    features: [
      "Zero platform fees on event registrations",
      "Receive notifications from Event Owner Pros",
      "Vendor Pro badge on your profile",
      "Priority listing in vendor search",
      "Book event spaces at no added cost",
    ],
  },
  {
    id: "general_pro",
    label: "General Pro",
    price: "$4.95",
    period: "/month",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    badge: null,
    features: [
      "General Pro badge on your profile",
      "Priority community chat visibility",
      "Early access to new features",
      "Support the artisan community",
    ],
  },
];

export default function UpgradePage() {
  const { isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const { mutate: upgrade, isPending } = useUpgradeCheckout();
  const { mutate: portal } = usePortalSession();
  const [, setLocation] = useLocation();

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const profile = profileData?.profile;
  const currentTier = profile?.subscriptionTier || "free";
  const hasActivePro = profile?.subscriptionStatus === "active" && currentTier !== "free";

  const handleUpgrade = (tierId: string) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    setSelectedTier(tierId);
    setTermsOpen(true);
    setTermsScrolled(false);
    setTermsAccepted(false);
  };

  const handleAcceptAndSubscribe = () => {
    if (!selectedTier || !termsAccepted) return;
    setTermsOpen(false);
    upgrade(selectedTier);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-10">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium mb-6 border border-amber-500/20">
          <Crown className="w-4 h-4" /> Pro Plans
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Upgrade Your Account</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Unlock premium features tailored to your role in the artisan community.</p>
        {hasActivePro && (
          <div className="mt-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 inline-flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 dark:text-green-300 font-medium">You have an active {TIERS.find(t => t.id === currentTier)?.label} subscription.</span>
            <Button size="sm" variant="outline" onClick={() => portal()} className="rounded-xl ml-2">Manage</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map(({ id, label, price, period, icon: Icon, color, badge, features }) => {
          const isCurrentPlan = currentTier === id && hasActivePro;
          return (
            <div key={id} className={`relative bg-card rounded-3xl border-2 shadow-lg flex flex-col ${isCurrentPlan ? 'border-primary' : 'border-border/50'} overflow-hidden`} data-testid={`tier-${id}`}>
              {badge && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-amber-500 text-white text-xs">{badge}</Badge>
                </div>
              )}
              <div className={`p-8 bg-gradient-to-br ${color} text-white`}>
                <Icon className="w-10 h-10 mb-4" />
                <h2 className="text-2xl font-display font-bold">{label}</h2>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-4xl font-bold">{price}</span>
                  <span className="text-white/80">{period}</span>
                </div>
              </div>
              <div className="flex-1 p-8 space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <div className="px-8 pb-8">
                {isCurrentPlan ? (
                  <Button className="w-full rounded-xl" variant="outline" onClick={() => portal()} data-testid={`button-manage-${id}`}>Manage Subscription</Button>
                ) : (
                  <Button
                    className={`w-full rounded-xl bg-gradient-to-r ${color} border-0 text-white shadow-lg`}
                    onClick={() => handleUpgrade(id)}
                    disabled={isPending}
                    data-testid={`button-upgrade-${id}`}
                  >
                    {isPending && selectedTier === id ? "Redirecting..." : isAuthenticated ? `Get ${label}` : "Login to Subscribe"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terms Modal */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Terms of Service</DialogTitle>
            <DialogDescription>Please read and accept before subscribing to {TIERS.find(t => t.id === selectedTier)?.label}.</DialogDescription>
          </DialogHeader>
          <div
            className="max-h-64 overflow-y-auto border border-border rounded-xl p-4 text-sm text-muted-foreground font-mono leading-relaxed bg-muted/30 whitespace-pre-wrap"
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setTermsScrolled(true);
            }}
          >
            {TERMS}
          </div>
          {!termsScrolled && <p className="text-xs text-amber-600 text-center">Please scroll to the bottom to accept.</p>}
          <div className="flex items-start gap-3 mt-2">
            <input
              type="checkbox"
              id="terms-accept"
              data-testid="checkbox-terms"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              disabled={!termsScrolled}
              className="w-4 h-4 mt-0.5 rounded accent-primary"
            />
            <label htmlFor="terms-accept" className={`text-sm ${!termsScrolled ? 'text-muted-foreground' : 'text-foreground'}`}>
              I have read and agree to the Artisan Collective Pro Terms of Service.
            </label>
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setTermsOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-amber-500"
              disabled={!termsAccepted || isPending}
              onClick={handleAcceptAndSubscribe}
              data-testid="button-accept-subscribe"
            >
              Accept & Subscribe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
