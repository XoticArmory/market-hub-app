import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type ClaimStatus = { hasPendingClaim: boolean; status: string | null };

export type AdminClaimRequest = {
  id: number;
  eventId: number;
  userId: string;
  message: string | null;
  status: string;
  createdAt: string;
  decidedAt: string | null;
  eventTitle: string | null;
  eventLocation: string | null;
  eventDate: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterAvatar: string | null;
};

/** Current user's claim status for one event. Drives the Claim button /
 *  pending badge on the event detail page. Only called for signed-in users. */
export function useClaimStatus(eventId: number, enabled: boolean) {
  return useQuery<ClaimStatus>({
    queryKey: ["/api/events", eventId, "claim-status"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/claim-status`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load claim status");
      return (await res.json()) as ClaimStatus;
    },
    enabled: enabled && !!eventId && !isNaN(eventId),
    retry: false,
  });
}

export function useSubmitClaim(eventId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (message?: string) => {
      const res = await fetch(`/api/events/${eventId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || undefined }),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to submit claim");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "claim-status"] });
      toast({
        title: "Claim request sent",
        description: "We'll review it and hand over ownership once we've confirmed you're the organizer.",
      });
    },
    onError: (e: Error) => toast({ title: "Claim request failed", description: e.message, variant: "destructive" }),
  });
}

/** Admin queue of listing-claim requests, newest first. */
export function useAdminClaimRequests() {
  return useQuery<AdminClaimRequest[]>({
    queryKey: ["/api/admin/claim-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/claim-requests", { credentials: "include" });
      if (res.status === 403) return [];
      if (!res.ok) throw new Error("Failed to load claim requests");
      return res.json();
    },
    retry: false,
  });
}

/** Approve transfers ownership to the requester; reject closes the request. */
export function useReviewClaimRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: "approve" | "reject" }) => {
      const res = await fetch(`/api/admin/claim-requests/${id}/${decision}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to review claim");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claim-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({
        title: vars.decision === "approve" ? "Ownership transferred." : "Claim request rejected.",
      });
    },
    onError: (e: Error) => toast({ title: "Review failed", description: e.message, variant: "destructive" }),
  });
}
