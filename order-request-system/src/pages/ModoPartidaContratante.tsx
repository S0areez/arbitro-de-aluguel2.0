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
  const [shareGps, setShareGps] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [peerLocation, setPeerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
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

  useEffect(() => {
    if (!match || !id) return;
    const channel = supabase.channel(`match:${id}`, { config: { broadcast: { self: true } } });
    channel.on('broadcast', { event: 'location' }, (payload: any) => {
      const sameRole = (isReferee && payload?.payload?.role === 'arbitro') || (isContractor && payload?.payload?.role === 'contratante');
      if (sameRole) return;
      const { lat, lng } = payload?.payload || {};
      if (typeof lat === 'number' && typeof lng === 'number') {
        setPeerLocation({ lat, lng });
      }
    });
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [id, match, isReferee, isContractor]);

  useEffect(() => {
    const handleGeoError = (err: GeolocationPositionError) => {
      if (err.code === 1) {
        toast.error("Permita o acesso à localização nas configurações do navegador.");
      } else if (err.code === 2) {
        toast.error("Sinal de localização indisponível no momento.");
      } else if (err.code === 3) {
        toast.error("Tempo excedido ao obter a localização.");
      } else {
        toast.error("Não foi possível obter a localização.");
      }
      setShareGps(false);
    };
    const startWatch = () => {
      const idWatch = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMyLocation({ lat, lng });
          supabase.channel(`match:${id}`).send({
            type: 'broadcast',
            event: 'location',
            payload: { role: isReferee ? 'arbitro' : 'contratante', lat, lng, ts: Date.now() }
          });
        },
        handleGeoError,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
      setWatchId(idWatch);
    };
    if (!shareGps) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      return;
    }
    if (!window.isSecureContext) {
      toast.error("GPS exige HTTPS ou localhost. Acesse via túnel HTTPS ou localhost.");
      setShareGps(false);
      return;
    }
    if (!('geolocation' in navigator)) {
      toast.error("Seu dispositivo não suporta GPS.");
      setShareGps(false);
      return;
    }
    const checkPermissionAndStart = async () => {
      try {
        // @ts-ignore
        if (navigator.permissions && navigator.permissions.query) {
          // @ts-ignore
          const p = await navigator.permissions.query({ name: 'geolocation' });
          if (p.state === 'denied') {
            toast.error("Permita a localização para compartilhar sua posição.");
            setShareGps(false);
            return;
          }
        }
      } catch {}
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMyLocation({ lat, lng });
          supabase.channel(`match:${id}`).send({
            type: 'broadcast',
            event: 'location',
            payload: { role: isReferee ? 'arbitro' : 'contratante', lat, lng, ts: Date.now() }
          });
          startWatch();
        },
        handleGeoError,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    checkPermissionAndStart();
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [shareGps, id, isReferee, watchId]);
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

  const statusFlow: MatchStatus[] = ["aceita", "a_caminho", "em_andamento", "finalizada"];
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
      if (currentIndex < statusFlow.length - 1) {
          const nextStatus = statusFlow[currentIndex + 1];
          
          if (nextStatus === 'finalizada') {
              // Quando o árbitro finaliza, chama a mesma lógica de liberação (ou apenas atualiza status e deixa o contratante confirmar)
              // Neste caso, vamos apenas atualizar o status e deixar o pagamento ser processado pela Edge Function se possível
              // OU, se você quiser que o árbitro também dispare o pagamento:
              try {
                  await supabase.functions.invoke('finish-match', { body: { match_id: match.id } });
              } catch (e) { console.error(e); }
          }
          updateMatch.mutate({ id: match.id, updates: { status: nextStatus } });
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

         updateMatch.mutate({ id: match.id, updates: { status: 'finalizada' } }, {
             onSuccess: () => toast.success("Status atualizado (Atenção: Transação financeira requer Edge Function ativa)"),
             onError: () => toast.error("Falha ao finalizar partida.")
         });
      }
  };

  const openMaps = () => {
      const query = encodeURIComponent(match.location);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };
  const openRouteToPeer = () => {
      if (!peerLocation) return;
      const dest = `${peerLocation.lat},${peerLocation.lng}`;
      const origin = myLocation ? `${myLocation.lat},${myLocation.lng}` : undefined;
      const url = origin 
        ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
        : `https://www.google.com/maps/search/?api=1&query=${dest}`;
      window.open(url, '_blank');
  };
  const distanceKm = () => {
      if (!myLocation || !peerLocation) return null;
      const toRad = (v: number) => v * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(peerLocation.lat - myLocation.lat);
      const dLng = toRad(peerLocation.lng - myLocation.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(myLocation.lat)) * Math.cos(toRad(peerLocation.lat)) * Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return (R * c);
  };

  const MiniMap = ({ center, my, peer, zoom = 15 }: { center?: { lat: number; lng: number } | null; my?: { lat: number; lng: number } | null; peer?: { lat: number; lng: number } | null; zoom?: number }) => {
      const c = center || peer || my;
      if (!c) return <div className="text-xs text-muted-foreground">Localização indisponível</div>;
      const size = "256x256";
      const params = new URLSearchParams();
      params.set("center", `${c.lat},${c.lng}`);
      params.set("zoom", `${zoom}`);
      params.set("size", size);
      if (peer) params.append("markers", `${peer.lat},${peer.lng},red`);
      if (my) params.append("markers", `${my.lat},${my.lng},lightblue1`);
      const url = `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
      return (
        <div className="relative w-[256px] h-[256px] rounded-lg overflow-hidden border border-border">
            <img src={url} alt="map" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      );
  };
  const setManualLocation = () => {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        toast.error("Informe coordenadas válidas (lat, lng).");
        return;
      }
      setMyLocation({ lat, lng });
      supabase.channel(`match:${id}`).send({
        type: 'broadcast',
        event: 'location',
        payload: { role: isReferee ? 'arbitro' : 'contratante', lat, lng, ts: Date.now() }
      });
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
                 {match.status !== 'finalizada' && (
                    <Button 
                        size="sm" 
                        className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleAdvanceStatus}
                        disabled={updateMatch.isPending}
                    >
                        {match.status === 'aceita' && "Estou a Caminho"}
                        {match.status === 'a_caminho' && "Iniciar Partida"}
                        {match.status === 'em_andamento' && "Finalizar Partida"}
                    </Button>
                 )}
            </div>
        </div>

        {/* Timer & Check-in */}
        {match.status === 'em_andamento' && (
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
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${match.status === 'finalizada' ? 'bg-success text-success-foreground' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {match.status === 'finalizada' ? 'Pago/Processado' : 'Será liberado ao finalizar'}
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
        <div className="p-4 border rounded-xl space-y-3">
            <h4 className="font-semibold text-sm">Localização em tempo real</h4>
            <div className="flex items-center gap-2">
                <Button size="sm" variant={shareGps ? "secondary" : "outline"} onClick={() => setShareGps(!shareGps)}>
                    {shareGps ? "GPS Ativado" : "Ativar GPS"}
                </Button>
                <Button size="sm" onClick={openRouteToPeer} disabled={!peerLocation}>
                    Ver rota até contratante
                </Button>
            </div>
            <div className="text-xs text-muted-foreground">
                {myLocation ? `Você: ${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : "Sua localização: indisponível"}
            </div>
            <div className="text-xs text-muted-foreground">
                {peerLocation ? `Contratante: ${peerLocation.lat.toFixed(4)}, ${peerLocation.lng.toFixed(4)}` : "Contratante: aguardando"}
            </div>
            {distanceKm() && (
                <div className="text-xs font-medium">Distância aproximada: {distanceKm()!.toFixed(2)} km</div>
            )}
            <MiniMap center={peerLocation || myLocation} my={myLocation} peer={peerLocation} />
            <div className="grid grid-cols-3 gap-2 mt-3">
                <input 
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="Lat"
                  className="col-span-1 rounded-md border bg-background px-2 py-1 text-xs"
                />
                <input 
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="Lng"
                  className="col-span-1 rounded-md border bg-background px-2 py-1 text-xs"
                />
                <Button size="sm" variant="outline" onClick={setManualLocation} className="col-span-1">
                  Usar localização manual
                </Button>
            </div>
        </div>
    </div>
  );

  const ContractorView = () => (
    <div className="space-y-6">
        {/* Status Tracker */}
        <div className="relative pt-8 pb-4 px-4">
             <div className="absolute top-0 left-0 w-full h-1 bg-secondary overflow-hidden">
                 <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${((currentIndex + 1) / statusFlow.length) * 100}%` }}
                 />
             </div>
             <div className="text-center space-y-1">
                 <h2 className="text-xl font-bold text-foreground">
                    {match.status === 'aceita' && "Árbitro Aceitou"}
                    {match.status === 'a_caminho' && "Árbitro a Caminho"}
                    {match.status === 'em_andamento' && "Partida em Andamento"}
                    {match.status === 'finalizada' && "Partida Finalizada"}
                 </h2>
                 <p className="text-sm text-muted-foreground">
                    {match.status === 'aceita' && "Aguarde o deslocamento."}
                    {match.status === 'a_caminho' && "Ele deve chegar em breve."}
                    {match.status === 'em_andamento' && "Acompanhe o tempo abaixo."}
                    {match.status === 'finalizada' && "Avalie o serviço."}
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
        {match.status === 'em_andamento' && (
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

        {match.status === 'em_andamento' && (
             <Button 
                onClick={handleFinalizarPartida}
                className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold"
             >
                 <CheckCircle2 className="mr-2" /> Finalizar Partida e Liberar Pagamento
             </Button>
        )}

        <div className="p-4 border rounded-xl space-y-3">
            <h4 className="font-semibold text-sm">Localização do árbitro</h4>
            <div className="flex items-center gap-2">
                <Button size="sm" variant={shareGps ? "secondary" : "outline"} onClick={() => setShareGps(!shareGps)}>
                    {shareGps ? "Compartilhar minha localização" : "Compartilhar minha localização"}
                </Button>
                <Button size="sm" onClick={openRouteToPeer} disabled={!peerLocation}>
                    Ver rota até árbitro
                </Button>
            </div>
            <div className="text-xs text-muted-foreground">
                {myLocation ? `Você: ${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : "Sua localização: desativada"}
            </div>
            <div className="text-xs text-muted-foreground">
                {peerLocation ? `Árbitro: ${peerLocation.lat.toFixed(4)}, ${peerLocation.lng.toFixed(4)}` : "Árbitro: aguardando"}
            </div>
            {distanceKm() && (
                <div className="text-xs font-medium">Distância aproximada: {distanceKm()!.toFixed(2)} km</div>
            )}
            <MiniMap center={peerLocation || myLocation} my={myLocation} peer={peerLocation} />
            <div className="grid grid-cols-3 gap-2 mt-3">
                <input 
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="Lat"
                  className="col-span-1 rounded-md border bg-background px-2 py-1 text-xs"
                />
                <input 
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="Lng"
                  className="col-span-1 rounded-md border bg-background px-2 py-1 text-xs"
                />
                <Button size="sm" variant="outline" onClick={setManualLocation} className="col-span-1">
                  Usar localização manual
                </Button>
            </div>
        </div>
        {/* Rating Section */}
        {match.status === 'finalizada' && (
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
