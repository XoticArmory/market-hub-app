import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { supabase } from "@/lib/supabase";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["/api/auth/user"], null);
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    window.location.href = "/";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut: false,
  };
}
