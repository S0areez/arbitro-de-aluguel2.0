import { MobileLayout } from "@/components/MobileLayout";
import { ArbitroCard } from "@/components/ArbitroCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useNavigate } from "react-router-dom";
import { Search, CalendarDays, MapPin, Clock, Trophy, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches, useReferees } from "@/hooks/use-supabase";

const ContratanteDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: matches, isLoading: loadingMatches } = useMatches(user?.id, "contratante");
  const { data: referees, isLoading: loadingReferees } = useReferees();

  // Filter upcoming matches (not finished/cancelled)
  const upcomingMatches = matches?.filter(
    (c) => c.status !== "finalizada" && c.status !== "cancelada"
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  // Get recommended referees (limit to 3 for now, could be smarter)
  const recommendedReferees = referees?.slice(0, 3) || [];

  const isLoading = loadingMatches || loadingReferees;

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-6 space-y-6">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">Olá, {profile?.full_name?.split(' ')[0] || 'Contratante'}</p>
              <h1 className="font-display text-2xl font-black">Dashboard</h1>
            </div>
          </div>
          <button
            onClick={() => navigate("/busca")}
            className="mt-3 flex w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            <Search size={18} />
            <span className="text-sm">Buscar árbitros...</span>
          </button>
        </div>

        <div
          onClick={() => navigate("/league-management")}
          className="rounded-2xl p-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow hover:brightness-105 transition-[filter] cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Trophy size={18} />
            <div>
              <h3 className="text-sm font-bold">Gestão de Ligas</h3>
              <p className="text-xs opacity-90">Organize campeonatos e múltiplos jogos.</p>
            </div>
          </div>
          <ArrowRight size={16} />
        </div>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Próximas Partidas</h2>
          {upcomingMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma partida agendada.</p>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map((c) => {
                // Check if referee is joined or find in list
                // useMatches already joins referee profile as 'referee' (mapped in hook)
                const arb = c.referee; 
                
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (c.status === 'pending' || c.status === 'waiting_payment') {
                        navigate(`/payment/${c.id}`);
                      } else {
                        navigate(`/partida/${c.id}`);
                      }
                    }}
                    className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 cursor-pointer hover:border-blue-500/40 hover:bg-slate-900/70 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground text-sm">{c.modality}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CalendarDays size={12} />
                        <span>{new Date(c.date).toLocaleDateString()} às {c.time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin size={12} />
                        <span>{c.location}</span>
                      </div>
                      {arb && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock size={12} />
                          <span>Árbitro: {arb.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Recomendados</h2>
            <button onClick={() => navigate("/busca")} className="text-xs font-medium text-blue-600 hover:underline">Ver todos</button>
          </div>
          <div className="space-y-2">
            {recommendedReferees.map((a) => (
              <ArbitroCard key={a.id} arbitro={a} />
            ))}
            {recommendedReferees.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum árbitro encontrado.</p>
            )}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default ContratanteDashboard;
