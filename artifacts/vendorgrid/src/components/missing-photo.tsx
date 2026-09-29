import { Package, Sparkles } from "lucide-react";

export function MissingPhoto({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <div
      role="img"
      aria-label={`No photo available for ${name}`}
      className={`relative isolate flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#fff1e3] via-[#f8e5cf] to-[#e8c6a7] text-[#693d27] ${compact ? "rounded-lg" : ""}`}
    >
      <div aria-hidden="true" className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[18px] border-primary/10" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full border-[20px] border-[#b87343]/15" />
      <div aria-hidden="true" className={`relative flex rotate-[-7deg] flex-col items-center justify-center rounded-2xl border border-[#c68d65]/40 bg-[#fffaf4]/80 shadow-lg shadow-[#8d5635]/10 ${compact ? "h-10 w-10" : "h-36 w-36"}`}>
        <Package className={compact ? "h-5 w-5 text-primary" : "h-12 w-12 text-primary"} strokeWidth={1.5} />
        {!compact && <Sparkles className="absolute right-4 top-4 h-4 w-4 text-[#bd7b48]" />}
      </div>
      {!compact && (
        <div className="absolute inset-x-4 bottom-5 text-center">
          <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-[#9b6846]">Community find</span>
          <span className="mt-1 block truncate font-display text-lg font-bold">{name}</span>
        </div>
      )}
    </div>
  );
}