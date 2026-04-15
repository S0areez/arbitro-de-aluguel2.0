import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useMatch, useUpdateMatch, useCreateReview } from "@/hooks/use-supabase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, CheckCircle2, Star, Loader2, Timer, AlertTriangle, 
  MapPin, DollarSign, User, Phone, Navigation, Flag 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database } from "@/types/database.types";
import { supabase } from "@/integrations/supabase/client";

type MatchStatus = Database["public"]["Tables"]["matches"]["Row"]["status"];

const ModoPartidaContratante = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: match, isLoading } = useMatch(id);
  const updateMatch = useUpdateMatch();
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [elapsedString, setElapsedString] = useState("00:00:00");
  const [isOvertime, setIsOvertime] = useState(false);
  const isContractor = !!(user?.id && match?.contractor_id && user.id === match.contractor_id);
  const isReferee = !!(user?.id && match?.referee_id && user.id === match.referee_id);

  // Timer Logic
  useEffect(() => {
    if (!match || match.status !== "em_andamento") return;

    const interval = setInterval(() => {
      const startDateTime = new Date(`${match.date}T${match.time}`);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - startDateTime.getTime()) / 1000);
      const safeDiff = Math.max(0, diffInSeconds);

      const hours = Math.floor(safeDiff / 3600);
      const minutes = Math.floor((safeDiff % 3600) / 60);
      const seconds = safeDiff % 60;

      setElapsedString(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      const durationHours = match.duration || 1;
      const limitSeconds = (durationHours * 3600) + (10 * 60);

      if (safeDiff > limitSeconds && !isOvertime) {
        setIsOvertime(true);
        toast("Tempo Extra Detectado!", {
          description: "A partida excedeu o tempo contratado (+10min).",
          duration: Infinity,
          icon: <AlertTriangle className="text-yellow-500" />
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match, isOvertime]);
  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
        <MobileLayout showNav={false}>
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-muted-foreground">Partida não encontrada.</p>
                <Button onClick={() => navigate(-1)}>Voltar</Button>
            </div>
        </MobileLayout>
    );
  }

  const statusFlow: MatchStatus[] = ["confirmed", "ready", "in_progress", "completed"];
  const currentIndex = statusFlow.indexOf(match.status);

  // Handlers
  const handleCheckIn = () => {
    if (isContractor) {
      if (match.contractor_checkin) return;
      updateMatch.mutate({ id: match.id, updates: { contractor_checkin: true } }, {
        onSuccess: () => toast.success("Check-in realizado!")
      });
    } else if (isReferee) {
      if (match.referee_checkin) return;
      updateMatch.mutate({ id: match.id, updates: { referee_checkin: true } }, {
        onSuccess: () => toast.success("Check-in do árbitro realizado!")
      });
    }
  };

  const handleAvaliar = () => {
    if (rating === 0) { toast.error("Selecione uma nota"); return; }
    if (!user || !match.referee_id) return;

    createReview.mutate({
      match_id: match.id,
      reviewer_id: user.id,
      target_id: match.referee_id,
      rating: rating,
      punctuality: 5,
      professionalism: 5,
      comment: comentario
    }, {
      onSuccess: () => navigate("/contratante")
    });
  };

  const handleAdvanceStatus = async () => {
      if (match.status === 'confirmed') {
          updateMatch.mutate({ id: match.id, updates: { status: 'ready' } });
          return;
      }
      if (match.status === 'ready') {
          updateMatch.mutate({ id: match.id, updates: { status: 'in_progress' } });
          return;
      }
      if (match.status === 'in_progress') {
          updateMatch.mutate({ id: match.id, updates: { status: 'completed' } });
          return;
      }
  };

  const handleFinalizarPartida = async () => {
      if (!confirm("Tem certeza que deseja finalizar a partida e liberar o pagamento ao árbitro?")) return;
      toast.loading("Processando finalização...");

      // Tenta usar a Edge Function (Segura, Production Ready)
      try {
        const { data, error } = await supabase.functions.invoke('finish-match', {
            body: { match_id: match.id }
        });

        if (error) throw error;
        
        toast.dismiss();
        toast.success("Partida finalizada e pagamento liberado!");
        // O realtime deve atualizar o status, mas podemos forçar reload se necessário
      } catch (err) {
        console.error("Erro ao chamar Edge Function:", err);
        
         // FALLBACK APENAS PARA DESENVOLVIMENTO LOCAL (Se Edge Function falhar por falta de setup)
         // Tenta atualizar apenas o status. O pagamento (transação) falhará se RLS estiver ativo,
         // mas pelo menos o status muda.
         toast.dismiss();
         toast.warning("Erro ao conectar com servidor de pagamentos. Tentando finalizar apenas o status...");
         
         // Tenta aprovar o pagamento localmente (pode falhar por RLS, mas tentamos)
         // await supabase.from('payments').update({ status: 'approved' }).eq('reserva_id', match.id); // REMOVIDO PARA EVITAR ERRO DE RLS NO CONSOLE

         updateMatch.mutate({ id: match.id, updates: { status: 'completed' } }, {
             onSuccess: () => toast.success("Status atualizado (Atenção: Transação financeira requer Edge Function ativa)"),
             onError: () => toast.error("Falha ao finalizar partida.")
         });
      }
  };

  const openMaps = () => {
      const query = encodeURIComponent(match.location);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // --- VIEWS ---

  const RefereeView = () => (
    <div className="space-y-6">
        {/* Header Action Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-bold text-foreground">{match.modality}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin size={14} /> {match.location}
                    </p>
                </div>
                <StatusBadge status={match.status} />
            </div>

            <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={openMaps}>
                    <Navigation size={16} /> Navegar
                 </Button>
                 {match.status !== 'completed' && match.status !== 'waiting_payment' && match.status !== 'pending' && (
                    <Button 
                        size="sm" 
                        className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleAdvanceStatus}
                        disabled={updateMatch.isPending}
                    >
                        {match.status === 'confirmed' && "Aceitar Partida"}
                        {match.status === 'ready' && "Iniciar Partida"}
                        {match.status === 'in_progress' && "Finalizar Partida"}
                    </Button>
                 )}
            </div>
        </div>

        {/* Timer & Check-in */}
{match.status === 'in_progress' && (
             <div className={`rounded-xl border p-6 text-center space-y-2 ${isOvertime ? "border-destructive bg-destructive/10" : "border-primary/20 bg-primary/5"}`}>
                <div className="text-5xl font-mono font-bold tracking-tight">{elapsedString}</div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tempo Decorrido</p>
             </div>
        )}

        {/* Check-in Status */}
        <div className="grid grid-cols-2 gap-3">
             <div className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 ${match.referee_checkin ? 'bg-green-500/10 border-green-500/20' : 'bg-secondary/50 border-border'}`}>
                 <CheckCircle2 size={20} className={match.referee_checkin ? "text-green-500" : "text-muted-foreground"} />
                 <span className="text-xs font-medium">Seu Check-in</span>
                 {!match.referee_checkin && (
                     <Button size="xs" variant="ghost" onClick={handleCheckIn} className="h-6 text-[10px]">Confirmar</Button>
                 )}
             </div>
             <div className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 ${match.contractor_checkin ? 'bg-green-500/10 border-green-500/20' : 'bg-secondary/50 border-border'}`}>
                 <User size={20} className={match.contractor_checkin ? "text-green-500" : "text-muted-foreground"} />
                 <span className="text-xs font-medium">Contratante</span>
             </div>
        </div>

        <div className="bg-secondary/30 rounded-xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <DollarSign size={20} />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">A receber nesta partida</p>
                    <p className="text-lg font-bold">R$ {(match.price - (match.platform_fee || 0)).toFixed(2)}</p>
                </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${match.status === 'completed' ? 'bg-success text-success-foreground' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {match.status === 'completed' ? 'Pago/Processado' : 'Será liberado ao finalizar'}
            </span>
        </div>

        {/* Contractor Info */}
        {match.contractor && (
            <div className="flex items-center gap-4 p-4 border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User size={20} className="text-muted-foreground"/>
                </div>
                <div className="flex-1">
                    <p className="font-medium text-sm">{match.contractor.full_name}</p>
                    <p className="text-xs text-muted-foreground">Contratante</p>
                </div>
                <Button size="icon" variant="ghost">
                    <Phone size={18} />
                </Button>
            </div>
        )}
    </div>
  );

  const ContractorView = () => (
    <div className="space-y-6">
        {/* Status Tracker */}
        <div className="relative pt-8 pb-4 px-4">
             <div className="absolute top-0 left-0 w-full h-1 bg-secondary overflow-hidden">
                 <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, ((currentIndex + 1) / statusFlow.length) * 100))}%` }}
                 />
             </div>
             <div className="text-center space-y-1">
                 <h2 className="text-xl font-bold text-foreground">
                    {match.status === 'confirmed' && "Partida confirmada"}
                    {match.status === 'ready' && "Árbitro pronto para o jogo"}
                    {match.status === 'in_progress' && "Partida em andamento"}
                    {match.status === 'completed' && "Partida concluída"}
                 </h2>
                 <p className="text-sm text-muted-foreground">
                    {match.status === 'confirmed' && "Aguarde o aceite do árbitro."}
                    {match.status === 'ready' && "O árbitro já aceitou. Faça o check-in e comece a partida."}
                    {match.status === 'in_progress' && "Acompanhe o desenvolvimento do jogo."}
                    {match.status === 'completed' && "Deixe sua avaliação."}
                 </p>
             </div>
        </div>

        {/* Referee Profile Card */}
        {match.referee && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                     {match.referee.full_name?.charAt(0)}
                 </div>
                 <div className="flex-1">
                     <h3 className="font-bold text-sm">{match.referee.full_name}</h3>
                     <div className="flex items-center gap-1 text-xs text-yellow-500">
                         <Star size={12} className="fill-current" />
                         <span>{match.referee.rating_avg?.toFixed(1) || "5.0"}</span>
                         <span className="text-muted-foreground">• {match.referee.games_count || 0} jogos</span>
                     </div>
                 </div>
                 <Button size="icon" variant="secondary" className="rounded-full">
                     <Phone size={18} />
                 </Button>
            </div>
        )}

        {/* Timer (Read Only) */}
        {match.status === 'in_progress' && (
             <div className="flex flex-col items-center justify-center py-6 border-y border-dashed border-border">
                 <div className="text-4xl font-mono font-bold text-foreground">{elapsedString}</div>
                 {isOvertime && <span className="text-xs text-destructive font-bold">TEMPO EXCEDIDO</span>}
             </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
             <Button 
                variant="outline" 
                className={`w-full justify-start gap-2 ${match.contractor_checkin ? 'border-green-500 text-green-500' : ''}`}
                onClick={handleCheckIn}
                disabled={match.contractor_checkin}
             >
                 <CheckCircle2 size={18} />
                 {match.contractor_checkin ? "Check-in Feito" : "Fazer Check-in"}
             </Button>
             <Button variant="outline" className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                 <Flag size={18} /> Reportar
             </Button>
        </div>

        {match.status === 'in_progress' && (
             <Button 
                onClick={handleFinalizarPartida}
                className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold"
             >
                 <CheckCircle2 className="mr-2" /> Finalizar Partida e Liberar Pagamento
             </Button>
        )}
        {/* Rating Section */}
        {match.status === 'completed' && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-display text-sm font-semibold text-foreground text-center">Como foi a arbitragem?</h3>
            <h3 className="font-display text-sm font-semibold text-foreground text-center">Como foi a arbitragem?</h3>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setRating(i)} className="transition-transform hover:scale-110 focus:outline-none">
                  <Star size={32} className={`${i <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"} transition-colors`} />
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escreva um comentário (opcional)..."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              rows={3}
            />
            <Button onClick={handleAvaliar} disabled={createReview.isPending} className="w-full rounded-xl">
                {createReview.isPending ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        )}
    </div>
  );

  return (
    <MobileLayout showNav={false}>
      <div className="px-4 pt-4 pb-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} /><span className="text-sm font-medium">Voltar</span>
        </button>

        {isReferee ? <RefereeView /> : <ContractorView />}
        
      </div>
    </MobileLayout>
  );
};

export default ModoPartidaContratante;
