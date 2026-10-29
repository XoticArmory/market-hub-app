import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type ReferralCodeInfo = {
  code: string | null;
  usesCount?: number;
  rewardsGranted?: number;
};

export function useReferralCode() {
  return useQuery({
    queryKey: ["/api/referral-code"],
    queryFn: async () => {
      const res = await fetch("/api/referral-code", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gift code");
      return res.json() as Promise<ReferralCodeInfo>;
    },
  });
}

export function useCreateReferralCode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/referral-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-code"] });
      toast({ title: "Gift code created!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
