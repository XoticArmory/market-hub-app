import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useUpgradeCheckout() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ tier, promoCode, returnTo }: { tier: string; promoCode?: string; returnTo?: string }) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, promoCode: promoCode || undefined, returnTo }),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e: Error) => toast({ title: "Checkout Error", description: e.message, variant: "destructive" }),
  });
}

export function useValidatePromo() {
  return useMutation({
    mutationFn: async ({ code, tier }: { code: string; tier: string }) => {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tier }),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ valid: boolean; promoCode?: any; error?: string }>;
    },
  });
}

export function useRedeemAdminCode() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/promo-codes/redeem-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Access granted", description: "Temporary admin access has been activated. Refresh to see changes." });
    },
    onError: (e: Error) => toast({ title: "Invalid code", description: e.message, variant: "destructive" }),
  });
}

export function useAcceptTerms() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (tier: string) => {
      const res = await fetch("/api/stripe/terms-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
