import { useState, useEffect, useRef } from "react";
import { useValidatePromo, useRedeemAdminCode } from "@/hooks/use-upgrade";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { usePortalSession } from "@/hooks/use-stripe";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, Store, Package, Crown, ArrowRight, Tag, ShieldCheck, Loader2, X, CreditCard } from "lucide-react";

const TERMS = `VENDORLOOP PRO — SUBSCRIPTION TERMS OF SERVICE

Last updated: February 2026

By subscribing to a VendorLoop Pro plan, you agree to the following terms:

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

const VENDOR_PRO_FEATURES = [
  "Find events in your area",
  "Register with events to show your attendance",
  "Post up to 10 product photos per event",
  "Communicate directly with event owners",
  "Receive notifications of events in your area",
  "Register for notifications in multiple areas",
  "View analytics such as inventory trackers and events you're attending",
  "Link your personal or business website to drive traffic",
];

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
      "Post Unlimited Multi-day Events",
      "View who is interested and who is planning to attend",
      "Allow vendors to register for your event",
      "Track how many spaces are filled with customizable event mapping",
      "View event analytics such as repeat vendors and all vendors across your posted events",
      "Link your personal or company website to drive traffic",
      "Send notifications to vendors in your event's area",
      "Plus much more!",
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
    features: VENDOR_PRO_FEATURES,
  },
];

function SquareCardDialog({
  open,
  onOpenChange,
  tier,
  promoCode,
  promoDiscount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tier: string | null;
  promoCode?: string;
  promoDiscount?: number;
}) {
  const [sdkLoading, setSdkLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: squareConfig } = useQuery({
    queryKey: ['/api/square/config'],
    queryFn: async () => {
      const res = await fetch('/api/square/config');
      if (!res.ok) return null;
      return res.json() as Promise<{ appId: string | null; locationId: string | null; environment: string }>;
    },
    enabled: open,
  });

  const tierInfo = tier ? TIERS.find(t => t.id === tier) : null;
  const basePrice = parseFloat((tierInfo?.price || '$0').replace('$', ''));
  const finalPrice = promoDiscount ? (basePrice * (1 - promoDiscount / 100)).toFixed(2) : basePrice.toFixed(2);

  useEffect(() => {
    if (!open || !squareConfig?.appId || !squareConfig?.locationId) return;

    setSdkLoading(true);
    setError(null);
    if (cardRef.current) {
      try { cardRef.current.destroy(); } catch (_) {}
      cardRef.current = null;
    }

    const scriptUrl = squareConfig.environment === 'sandbox'
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';

    const initCard = async () => {
      try {
        const payments = await (window as any).Square.payments(squareConfig.appId, squareConfig.locationId);
        const card = await payments.card();
        await card.attach('#square-card-container');
        cardRef.current = card;
        setSdkLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to initialize payment form.');
        setSdkLoading(false);
      }
    };

    const existing = document.getElementById('square-web-sdk');
    if (existing && (window as any).Square) {
      initCard();
    } else {
      const script = document.createElement('script');
      script.id = 'square-web-sdk';
      script.src = scriptUrl;
      script.onload = initCard;
      script.onerror = () => { setError('Failed to load Square payment SDK.'); setSdkLoading(false); };
      document.head.appendChild(script);
    }

    return () => {
      if (cardRef.current) {
        try { cardRef.current.destroy(); } catch (_) {}
        cardRef.current = null;
      }
    };
  }, [open, squareConfig?.appId, squareConfig?.locationId]);

  const handleSubmit = async () => {
    if (!cardRef.current || !tier) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== 'OK') {
        setError(result.errors?.[0]?.message || 'Card verification failed.');
        setSubmitting(false);
        return;
      }
      const res = await fetch('/api/square/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier, sourceId: result.token, promoCode: promoCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Subscription failed.');
        setSubmitting(false);
        return;
      }
      qc.invalidateQueries({ queryKey: ['/api/profile'] });
      qc.invalidateQueries({ queryKey: ['/api/square/subscription'] });
      onOpenChange(false);
      toast({ title: "Subscribed!", description: `You are now on ${tierInfo?.label}. Welcome!` });
      window.location.href = `/profile?subscribed=${tier}`;
    } catch (e: any) {
      setError(e.message || 'An error occurred.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Payment Details
          </DialogTitle>
          <DialogDescription>
            {tierInfo?.label} — <span className="font-semibold">${finalPrice}/month</span> recurring
            {promoDiscount ? <span className="text-green-600 ml-1">({promoDiscount}% promo applied)</span> : null}
          </DialogDescription>
        </DialogHeader>

        {!squareConfig?.appId ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
            Payment is not yet configured. Please contact the admin to set up the Square Application ID.
          </div>
        ) : (
          <>
            {sdkLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading secure payment form...
              </div>
            )}
            <div id="square-card-container" className={sdkLoading ? 'hidden' : 'min-h-[90px] py-1'} />
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Back</Button>
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-amber-500"
                onClick={handleSubmit}
                disabled={sdkLoading || submitting}
                data-testid="button-subscribe-now"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Subscribe — $${finalPrice}/mo`}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Secured by Square · Cancel anytime from your profile
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UpgradePage() {
  const { isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const { mutate: validatePromo, isPending: isValidating } = useValidatePromo();
  const { mutate: redeemAdmin, isPending: isRedeemingAdmin } = useRedeemAdminCode();
  const { mutate: portal } = usePortalSession();

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  // Promo code state per tier dialog
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid?: boolean; discount?: number; error?: string } | null>(null);

  // Admin code dialog
  const [adminCodeOpen, setAdminCodeOpen] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  const profile = profileData?.profile;
  const currentTier = profile?.subscriptionTier || "free";
  const hasActivePro = profile?.subscriptionStatus === "active" && currentTier !== "free";

  const handleUpgrade = (tierId: string) => {
    if (!isAuthenticated) { window.location.href = "/api/login"; return; }
    setSelectedTier(tierId);
    setPromoInput("");
    setPromoResult(null);
    setTermsOpen(true);
    setTermsScrolled(false);
    setTermsAccepted(false);
  };

  const handleValidatePromo = () => {
    if (!promoInput.trim() || !selectedTier) return;
    validatePromo({ code: promoInput.trim(), tier: selectedTier }, {
      onSuccess: (data) => {
        if (data.valid && data.promoCode?.type === 'discount') {
          setPromoResult({ valid: true, discount: data.promoCode.discountPercent });
        } else if (data.valid && data.promoCode?.type === 'temp_admin') {
          setPromoResult({ valid: false, error: "That code is a temporary admin access code. Use it in the admin access field below." });
        } else {
          setPromoResult({ valid: false, error: data.error || "Invalid code." });
        }
      },
      onError: (e: any) => setPromoResult({ valid: false, error: e.message }),
    });
  };

  const handleAcceptAndSubscribe = () => {
    if (!selectedTier || !termsAccepted) return;
    setTermsOpen(false);
    setCardOpen(true);
  };

  const discountedPrice = (basePrice: string) => {
    if (!promoResult?.valid || !promoResult.discount) return null;
    const num = parseFloat(basePrice.replace("$", ""));
    const discounted = num * (1 - promoResult.discount / 100);
    return `$${discounted.toFixed(2)}`;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-10">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium mb-6 border border-amber-500/20">
          <Crown className="w-4 h-4" /> Pro Plans
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Upgrade Your Account</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Unlock premium features tailored to your role in the artisan community.</p>
        {hasActivePro && (
          <div className="mt-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 inline-flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 dark:text-green-300 font-medium">You have an active {TIERS.find(t => t.id === currentTier)?.label || currentTier} subscription.</span>
            <Button size="sm" variant="outline" onClick={() => portal()} className="rounded-xl ml-2">Manage</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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
                    data-testid={`button-upgrade-${id}`}
                  >
                    {isAuthenticated ? `Get ${label}` : "Login to Subscribe"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Access Code */}
      {isAuthenticated && (
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setAdminCodeOpen(v => !v)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            data-testid="button-have-admin-code"
          >
            <ShieldCheck className="w-4 h-4" />
            Have a temporary admin access code?
          </button>
          {adminCodeOpen && (
            <div className="mt-3 flex gap-2 max-w-sm">
              <Input
                placeholder="Enter admin access code"
                value={adminCode}
                onChange={e => setAdminCode(e.target.value.toUpperCase())}
                className="rounded-xl font-mono"
                data-testid="input-admin-code"
              />
              <Button
                onClick={() => redeemAdmin(adminCode, { onSuccess: () => { setAdminCode(""); setAdminCodeOpen(false); } })}
                disabled={!adminCode.trim() || isRedeemingAdmin}
                className="rounded-xl shrink-0"
                data-testid="button-redeem-admin-code"
              >
                {isRedeemingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Terms + Promo Code Modal */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Terms of Service</DialogTitle>
            <DialogDescription>Please read and accept before subscribing to {TIERS.find(t => t.id === selectedTier)?.label}.</DialogDescription>
          </DialogHeader>
          <div
            className="max-h-48 overflow-y-auto border border-border rounded-xl p-4 text-sm text-muted-foreground font-mono leading-relaxed bg-muted/30 whitespace-pre-wrap"
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setTermsScrolled(true);
            }}
          >
            {TERMS}
          </div>
          {!termsScrolled && <p className="text-xs text-amber-600 text-center">Please scroll to the bottom to accept.</p>}

          {/* Promo Code */}
          <div className="mt-1">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />Promo Code (optional)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoResult(null); }}
                className="rounded-xl font-mono uppercase"
                data-testid="input-promo-code"
              />
              <Button
                variant="outline"
                onClick={handleValidatePromo}
                disabled={!promoInput.trim() || isValidating}
                className="rounded-xl shrink-0"
                data-testid="button-apply-promo"
              >
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
              {promoResult?.valid && (
                <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" onClick={() => { setPromoResult(null); setPromoInput(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {promoResult?.valid && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400" data-testid="promo-success">
                <CheckCircle className="w-4 h-4" />
                <span>{promoResult.discount}% discount applied — {discountedPrice(TIERS.find(t => t.id === selectedTier)?.price || "$0")}/mo</span>
              </div>
            )}
            {promoResult?.valid === false && (
              <p className="mt-2 text-sm text-destructive" data-testid="promo-error">{promoResult.error}</p>
            )}
          </div>

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
              I have read and agree to the VendorLoop Pro Terms of Service.
            </label>
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setTermsOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-amber-500"
              disabled={!termsAccepted}
              onClick={handleAcceptAndSubscribe}
              data-testid="button-accept-subscribe"
            >
              Accept & Continue to Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SquareCardDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        tier={selectedTier}
        promoCode={promoResult?.valid ? promoInput.trim() : undefined}
        promoDiscount={promoResult?.valid ? promoResult.discount : undefined}
      />
    </div>
  );
}
