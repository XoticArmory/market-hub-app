import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useEventRegistrations(eventId: number) {
  return useQuery({
    queryKey: ["/api/events", eventId, "registrations"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/registrations`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId,
  });
}

export function useRegisterVendorSpace(eventId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { spotId?: string; spotName?: string }) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      if (data.clientSecret) {
        toast({ title: "Space reserved!", description: "Complete payment to confirm your spot." });
      } else {
        toast({ title: "Registered!", description: "You've been registered for this event." });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUserRegistrations() {
  return useQuery({
    queryKey: ["/api/vendor/registrations"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/registrations", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });
}
