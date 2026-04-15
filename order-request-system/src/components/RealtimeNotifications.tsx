import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];

export const RealtimeNotifications = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || profile?.role !== "contratante") return;

    const channel = supabase
      .channel(`matches-accepted-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `contractor_id=eq.${user.id}`,
        },
        (payload) => {
          const oldRow = payload.old as Partial<MatchRow> | null;
          const newRow = payload.new as Partial<MatchRow> | null;
          if (!oldRow || !newRow) return;

          if (oldRow.status !== "ready" && newRow.status === "ready") {
            const when = newRow.date && newRow.time ? `${newRow.date} ${newRow.time}` : "";
            toast.success(
              `Árbitro aceitou sua partida`,
              {
                description: `${newRow.modality} • ${newRow.location} ${when ? "• " + when.slice(0, 16) : ""}`,
              }
            );
          }
        }
      );

    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [user, profile]);

  return null;
};
