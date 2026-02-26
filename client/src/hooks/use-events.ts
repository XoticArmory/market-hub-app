import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { EventResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useEvents(areaCode?: string) {
  const url = areaCode ? `${api.events.list.path}?areaCode=${encodeURIComponent(areaCode)}` : api.events.list.path;
  return useQuery({
    queryKey: [api.events.list.path, areaCode],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return (await res.json()) as EventResponse[];
    },
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: [api.events.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.events.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch event");
      return (await res.json()) as EventResponse;
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.events.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create event");
      }
      return (await res.json()) as EventResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.events.list.path] });
      toast({ title: "Event created!", description: "Your market event has been added." });
    },
    onError: (e: Error) => toast({ title: "Failed to create event", description: e.message, variant: "destructive" }),
  });
}
