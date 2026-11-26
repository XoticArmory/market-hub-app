import { createContext, useContext, useState, ReactNode } from "react";

export type PreviewTier = "admin" | "vendor_pro" | "free" | null;

interface AdminPreviewContextType {
  previewTier: PreviewTier;
  setPreviewTier: (tier: PreviewTier) => void;
}

export const AdminPreviewContext = createContext<AdminPreviewContextType>({
  previewTier: null,
  setPreviewTier: () => {},
});

export function AdminPreviewProvider({ children }: { children: ReactNode }) {
  // Persist across full page loads (the old in-memory state reset to the
  // admin's real view on any direct-URL navigation, which also made
  // server-gated pages such as /cogs look ungated in a Free preview).
  const [previewTier, setPreviewTierState] = useState<PreviewTier>(() => {
    const saved = sessionStorage.getItem("adminPreviewTier");
    return saved === "admin" || saved === "vendor_pro" || saved === "free" ? saved : null;
  });
  const setPreviewTier = (tier: PreviewTier) => {
    setPreviewTierState(tier);
    if (tier) sessionStorage.setItem("adminPreviewTier", tier);
    else sessionStorage.removeItem("adminPreviewTier");
  };
  return (
    <AdminPreviewContext.Provider value={{ previewTier, setPreviewTier }}>
      {children}
    </AdminPreviewContext.Provider>
  );
}

export function useAdminPreview() {
  return useContext(AdminPreviewContext);
}

export const PREVIEW_OVERRIDES: Record<string, Partial<any>> = {
  admin: { isAdmin: true, subscriptionTier: "vendor_pro", subscriptionStatus: "active", profileType: "pro" },
  vendor_pro: { isAdmin: false, subscriptionTier: "vendor_pro", subscriptionStatus: "active", profileType: "pro" },
  free: { isAdmin: false, subscriptionTier: "free", subscriptionStatus: "inactive", profileType: "general" },
};
