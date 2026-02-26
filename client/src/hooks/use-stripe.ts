import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["/api/square/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/square/subscription", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });
}

export function useCreateCheckout() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/square/upgrade", { method: "POST", credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e: Error) => toast({ title: "Checkout error", description: e.message, variant: "destructive" }),
  });
}

export function usePortalSession() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/square/manage", { method: "POST", credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
