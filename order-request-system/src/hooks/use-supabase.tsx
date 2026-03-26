import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/database.types";
import { toast } from "sonner";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchEvent = Database["public"]["Tables"]["match_events"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export type MatchWithDetails = Match & {
  referee?: Profile | null;
  contractor?: Profile | null;
};

export type MatchWithEvents = Match & {
  referee?: Profile | null;
  contractor?: Profile | null;
  match_events: MatchEvent[];
};

export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      return data?.[0] || null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export const useReferees = () => {
  return useQuery({
    queryKey: ["referees"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "arbitro");

      if (error) throw error;
      return data || [];
    },
  });
};

export const useMatches = (userId?: string, role?: "contratante" | "arbitro" | "admin") => {
  return useQuery({
    queryKey: ["matches", userId, role],
    queryFn: async (): Promise<MatchWithDetails[]> => {
      if (!userId) return [];
      let query = supabase.from("matches").select("*, referee:profiles!matches_referee_id_fkey(*), contractor:profiles!matches_contractor_id_fkey(*)");

      if (role === "contratante") {
        query = query.eq("contractor_id", userId);
      } else if (role === "arbitro") {
        query = query.eq("referee_id", userId);
      } else {
        // Fallback or admin view
        query = query.or(`contractor_id.eq.${userId},referee_id.eq.${userId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as MatchWithDetails[]) || [];
    },
    enabled: !!userId,
  });
};

export const useMatch = (matchId?: string) => {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: async (): Promise<MatchWithEvents | null> => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from("matches")
        .select("*, referee:profiles!matches_referee_id_fkey(*), contractor:profiles!matches_contractor_id_fkey(*), match_events(*)")
        .eq("id", matchId)
        .limit(1);

      if (error) throw error;
      return (data?.[0] as unknown as MatchWithEvents) || null;
    },
    enabled: !!matchId,
  });
};

export const useTransactions = (userId?: string) => {
  return useQuery({
    queryKey: ["transactions", userId],
    queryFn: async (): Promise<Transaction[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newMatch: Database["public"]["Tables"]["matches"]["Insert"]) => {
      const { data, error } = await (supabase
        .from("matches") as any)
        .insert(newMatch)
        .select()
        .single();

      if (error) throw error;
      return data as Match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Partida criada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar partida: ${error.message}`);
    },
  });
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Match> }) => {
      const { data, error } = await (supabase
        .from("matches") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Match;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["match", data.id] });
      }
      toast.success("Partida atualizada!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar partida: ${error.message}`);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { data, error } = await (supabase
        .from("profiles") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["profile", data.id] });
      }
      toast.success("Perfil atualizado!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });
};

export const useReviews = (targetId?: string) => {
  return useQuery({
    queryKey: ["reviews", targetId],
    queryFn: async (): Promise<(Review & { reviewer?: { full_name: string | null } | null })[]> => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name)")
        .eq("target_id", targetId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Transform data if needed, or cast
      return (data as unknown as (Review & { reviewer?: { full_name: string | null } | null })[]) || [];
    },
    enabled: !!targetId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newReview: Database["public"]["Tables"]["reviews"]["Insert"]) => {
      const { data, error } = await (supabase
        .from("reviews") as any)
        .insert(newReview)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", variables.target_id] });
      toast.success("Avaliação enviada!");
    },
    onError: (error) => {
      toast.error(`Erro ao enviar avaliação: ${error.message}`);
    },
  });
};
