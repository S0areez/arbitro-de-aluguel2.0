import { MobileLayout } from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches, useTransactions } from "@/hooks/use-supabase";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Navigation, 
  Bell, 
  X, 
  Check, 
  Star, 
  Wallet
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ArbitroDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: matches, refetch: refetchMatches } = useMatches(user?.id, "arbitro");
  const { data: transactions } = useTransactions(user?.id);
  const [isAvailable, setIsAvailable] = useState(true); // This could be synced with DB

  // Filter matches
  const pendingMatches = matches?.filter((m) => m.status === "confirmed") || [];
  const waitingPaymentMatches = matches?.filter((m) => m.status === "waiting_payment") || [];
  
  // Upcoming: ready, in progress
  const upcomingMatches = matches?.filter(
    (m) => ["ready", "in_progress"].includes(m.status)
  ).sort(
    (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  ) || [];
  
  const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

  // Calculate earnings
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);

  const paidWeek = transactions
    ?.filter((t) => t.type === "entrada" && new Date(t.created_at) >= startOfWeek)
    .reduce((acc, t) => acc + t.amount, 0) || 0;

  const finalizedWeek = (matches || []).filter(
    (m) => m.status === "finalizada" && new Date(`${m.date}T${m.time}`) >= startOfWeek
  );
  const expectedWeek = finalizedWeek.reduce(
    (acc, m) => acc + (m.price - (m.platform_fee || 0)),
    0
  );
  const pendingWeek = Math.max(expectedWeek - paidWeek, 0);

  // Handle Accept/Decline
  const handleMatchAction = async (matchId: string, action: 'aceitar' | 'recusar') => {
    try {
      const newStatus = action === 'aceitar' ? 'ready' : 'cancelada';
      
      const { error } = await (supabase
        .from('matches') as any)
        .update({ status: newStatus })
        .eq('id', matchId);

      if (error) throw error;
      
      toast.success(action === 'aceitar' ? "Partida aceita com sucesso!" : "Partida recusada.");
      refetchMatches();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar partida.");
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24 relative">
        {/* Header Section - Distinct for Referee */}
        <header className="bg-slate-900 text-white p-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute right-0 top-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute left-0 bottom-0 w-32 h-32 bg-secondary rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-primary/50 overflow-hidden bg-slate-800">
                   {profile?.avatar_url ? (
                     <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl">👨‍⚖️</div>
                   )}
                </div>
                <span className={`absolute bottom-0 right-0 w-5 h-5 border-4 border-slate-900 rounded-full ${isAvailable ? 'bg-success' : 'bg-muted'}`}></span>
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mb-1 border border-primary/20">
                  Painel do Árbitro
                </span>
                <h1 className="text-2xl font-bold font-display text-white">{profile?.full_name?.split(" ")[0] || "Árbitro"}</h1>
                <div className="flex items-center gap-2 text-slate-300 text-xs">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-white">{profile?.rating_avg?.toFixed(1) || "5.0"}</span>
                  </div>
                  <span>•</span>
                  <span>{profile?.games_count || 0} partidas</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center bg-slate-800/50 p-2 rounded-xl border border-slate-700 backdrop-blur-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Disponibilidade</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isAvailable}
                  onChange={() => setIsAvailable(!isAvailable)}
                />
                <div className="w-10 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </header>

        <div className="px-6 -mt-8 relative z-20">
          {/* Earnings Summary - Hero Card */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Wallet size={120} />
            </div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Wallet size={14} />
                  Ganhos da Semana
                </p>
                <h2 className="text-4xl font-bold text-foreground mt-2 tracking-tight">
                  R$ {paidWeek.toFixed(2)}
                </h2>
              </div>
              <button onClick={() => navigate('/carteira')} className="bg-secondary/50 p-2.5 rounded-xl text-foreground hover:bg-secondary transition-colors">
                <TrendingUp size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 text-sm font-medium relative z-10 bg-success/10 w-fit px-3 py-1.5 rounded-lg border border-success/20">
              <TrendingUp size={16} className="text-success" />
              <span className="text-success">R$ {pendingWeek.toFixed(2)} pendentes</span>
            </div>
          </div>
        </div>

        <div className="px-6 mt-8 space-y-8">
          {/* Next Match Card */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-display">
              <Calendar size={20} className="text-primary" />
              Próxima Escala
            </h3>
            
            {nextMatch ? (
              <div 
                onClick={() => navigate(`/partida/${nextMatch.id}`)}
                className="bg-card rounded-xl overflow-hidden border border-border shadow-lg cursor-pointer group hover:border-primary/50 transition-all"
              >
                <div className="h-32 w-full relative">
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                      {/* Using a darker map/stadium placeholder for contrast */}
                      <div className="absolute inset-0 bg-[url('/assets/dashboard-bg.jpg')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"></div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="bg-primary text-black text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                      {new Date(nextMatch.date).toDateString() === new Date().toDateString() ? 'HOJE' : format(new Date(nextMatch.date), 'dd MMM', { locale: ptBR }).toUpperCase()}
                    </span>
                    <span className="text-white font-bold text-sm flex items-center gap-1 drop-shadow-md">
                      {nextMatch.time.slice(0, 5)} • {nextMatch.modality}
                    </span>
                  </div>
                </div>
                <div className="p-4 relative">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-foreground text-sm truncate">{nextMatch.location}</h4>
                      <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                        <MapPin size={10} /> {nextMatch.location}
                      </p>
                    </div>
                    <button className="bg-primary text-black p-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                      <Navigation size={18} />
                    </button>
                  </div>
                  
                  {/* Quick Status Indicator */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status atual:</span>
                    <span className="font-bold text-primary uppercase">{nextMatch.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border border-dashed p-8 flex flex-col items-center justify-center text-center">
                 <Calendar size={32} className="text-muted-foreground mb-2" />
                 <p className="text-sm text-muted-foreground">Nenhuma escala próxima.</p>
              </div>
            )}
          </section>

          {/* Waiting Payment */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 font-display">
                <Bell size={20} className="text-yellow-500" />
                Aguardando Pagamento
              </h3>
              {waitingPaymentMatches.length > 0 && (
                <span className="bg-yellow-500/10 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {waitingPaymentMatches.length} aguardando
                </span>
              )}
            </div>
            <div className="space-y-4">
              {waitingPaymentMatches.length === 0 ? (
                 <div className="bg-card/50 rounded-xl p-6 text-center border border-border/50">
                    <p className="text-sm text-muted-foreground">Nenhuma partida aguardando pagamento.</p>
                 </div>
              ) : (
                waitingPaymentMatches.map((match) => (
                  <div key={match.id} className="bg-card p-4 rounded-xl border-l-4 border-l-yellow-500 border-y border-r border-border shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-yellow-500/10 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
                          {match.modality}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                           {format(new Date(match.date), 'EEE, dd MMM', { locale: ptBR })} • {match.time.slice(0, 5)}
                        </span>
                      </div>
                      <span className="text-yellow-700 font-bold text-sm bg-yellow-500/10 px-2 py-0.5 rounded">R$ {match.price}</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1 text-base">
                      {match.contractor?.full_name || "Contratante"}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                      <MapPin size={12} />
                      {match.location}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Pending Invites */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 font-display">
                <Bell size={20} className="text-primary" />
                Convites Pendentes
              </h3>
              {pendingMatches.length > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingMatches.length} AÇÃO NECESSÁRIA
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              {pendingMatches.length === 0 ? (
                 <div className="bg-card/50 rounded-xl p-6 text-center border border-border/50">
                    <p className="text-sm text-muted-foreground">Nenhum convite pendente no momento.</p>
                 </div>
              ) : (
                pendingMatches.map((match) => (
                  <div key={match.id} className="bg-card p-4 rounded-xl border-l-4 border-l-primary border-y border-r border-border shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-secondary text-primary text-[10px] font-bold px-2 py-1 rounded uppercase">
                          {match.modality}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                           {format(new Date(match.date), 'EEE, dd MMM', { locale: ptBR })} • {match.time.slice(0, 5)}
                        </span>
                      </div>
                      <span className="text-success font-bold text-sm bg-success/10 px-2 py-0.5 rounded">R$ {match.price}</span>
                    </div>
                    
                    <h4 className="font-semibold text-foreground mb-1 text-base">
                      {match.contractor?.full_name || "Contratante"}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                      <MapPin size={12} />
                      {match.location}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleMatchAction(match.id, 'recusar')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive/30 text-destructive font-bold text-sm hover:bg-destructive hover:text-white transition-colors"
                      >
                        <X size={16} /> Recusar
                      </button>
                      <button 
                        onClick={() => handleMatchAction(match.id, 'aceitar')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-success text-success-foreground font-bold text-sm hover:bg-success/90 transition-colors shadow-lg shadow-success/20"
                      >
                        <Check size={16} /> Aceitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ArbitroDashboard;
