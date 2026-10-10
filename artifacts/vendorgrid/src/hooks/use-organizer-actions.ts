import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { organizerActions, resolveHostEventAccess } from "@/lib/organizer-flow";

export function useOrganizerActions(plan: "monthly" | "annual" = "monthly") {
  const auth = useAuth();
  const profile = useProfile();
  const hostAccess = resolveHostEventAccess({
    authenticated: auth.isAuthenticated,
    authPending: auth.isLoading || auth.isFetching,
    authError: auth.isError,
    profilePending: profile.isLoading || profile.isFetching,
    profileError: profile.isError,
    profile: profile.data?.profile,
  });
  return {
    ...organizerActions(auth.isAuthenticated, hostAccess.canHost, plan),
    actionsReady: hostAccess.status === "ready",
    hostAccess,
    retryAccess: () => { void Promise.allSettled([auth.refetch(), profile.refetch()]); },
  };
}
