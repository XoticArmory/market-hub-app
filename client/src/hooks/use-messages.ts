import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMessages(areaCode?: string) {
  const url = areaCode ? `${api.messages.list.path}?areaCode=${encodeURIComponent(areaCode)}` : api.messages.list.path;
  return useQuery({
    queryKey: [api.messages.list.path, areaCode],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { content: string; areaCode?: string }) => {
      const res = await fetch(api.messages.create.path, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to send a message.");
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, data.areaCode] });
    },
    onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }),
  });
}
