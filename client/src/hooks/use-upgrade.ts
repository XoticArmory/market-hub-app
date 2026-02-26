import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useUpgradeCheckout() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (tier: string) => {
      const res = await fetch("/api/stripe/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e: Error) => toast({ title: "Checkout Error", description: e.message, variant: "destructive" }),
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
