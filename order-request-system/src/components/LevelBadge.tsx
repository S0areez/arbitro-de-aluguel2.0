import { Database } from "@/types/database.types";

type Level = Database["public"]["Tables"]["profiles"]["Row"]["level"];

// Ensure we handle null or undefined levels gracefully if needed, though props say 'nivel' is required.
// But the type in DB includes null. Let's assume non-null for the badge or handle it.
// If level is null, we might not render or render a default.
// Let's define the valid keys we support.

const levelConfig: Record<NonNullable<Level>, { emoji: string; label: string; className: string }> = {
  bronze: { emoji: "🥉", label: "Bronze", className: "bg-amber-900/30 text-amber-400 border-amber-700/50" },
  prata: { emoji: "🥈", label: "Prata", className: "bg-slate-500/20 text-slate-300 border-slate-500/50" },
  ouro: { emoji: "🥇", label: "Ouro", className: "bg-primary/20 text-primary border-primary/50" },
};

export const LevelBadge = ({ nivel }: { nivel: Level }) => {
  if (!nivel) return null;
  const config = levelConfig[nivel];
  if (!config) return null; // Fallback for unknown levels

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.emoji} {config.label}
    </span>
  );
};