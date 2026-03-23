import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useEventMap(eventId: number) {
  return useQuery({
    queryKey: ["/api/events", eventId, "map"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/map`, { credentials: "include" });
      if (!res.ok) return { eventId, mapData: { spots: [] } };
      return res.json();
    },
    enabled: !!eventId,
  });
}

export function useSaveEventMap(eventId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (mapData: any) => {
      const res = await fetch(`/api/events/${eventId}/map`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapData }),
        credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "map"] });
      toast({ title: "Map saved!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
