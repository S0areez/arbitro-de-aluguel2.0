import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { useMatch } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, QrCode, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PaymentScreen = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: loadingMatch } = useMatch(matchId);
  
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkoutStorageKey = `checkout-url-${matchId}`;

  useEffect(() => {
    if (!match || !matchId) return;
    if (!['cancelada', 'pending', 'waiting_payment'].includes(match.status)) {
      navigate(`/partida/${match.id}`);
    }
  }, [match, navigate]);

  useEffect(() => {
    if (!matchId) return;
    const savedUrl = localStorage.getItem(checkoutStorageKey);
    if (savedUrl) setCheckoutUrl(savedUrl);
  }, [matchId, checkoutStorageKey]);

  useEffect(() => {
    if (!matchId) return;
    if (checkoutUrl) {
      localStorage.setItem(checkoutStorageKey, checkoutUrl);
    } else {
      localStorage.removeItem(checkoutStorageKey);
    }
  }, [checkoutUrl, matchId, checkoutStorageKey]);

  // Escuta mudanças na tabela 'matches' via Realtime do Supabase
  useEffect(() => {
    if (!matchId) return;

    console.log("Iniciando Realtime para partida:", matchId);

    const channel = supabase
      .channel(`status-pagamento-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          console.log("Mudança detectada via Realtime:", payload);
          if (['confirmed', 'ready', 'in_progress', 'completed'].includes(payload.new.status)) {
            toast.success("Pagamento confirmado!");
            navigate(`/partida/${matchId}`);
          }
        }
      )
      .subscribe((status) => {
        console.log("Status da inscrição Realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, navigate]);

  const handleGeneratePayment = async () => {
  if (!match) return;
  setLoadingPayment(true);
  setError(null);

  try {
    console.log("Iniciando checkout para partida:", match.id);
    
    const { data, error } = await supabase.functions.invoke('checkout-mp', {
      body: {
        amount: Number(match.price), // Garanta que é um número
        reservaId: match.id
      }
    });

    if (error) {
      console.error("Erro na Edge Function (Invoke):", error);
      throw new Error("Falha ao comunicar com servidor de pagamentos.");
    }

    console.log("Resposta da Function:", data);

    if (data?.error) {
      throw new Error(`Erro do Pagamento: ${data.error}`);
    }

    if (data?.checkoutUrl) {
      setCheckoutUrl(data.checkoutUrl);
      await (supabase.from('matches') as any)
        .update({ status: 'waiting_payment' })
        .eq('id', match.id);
      // Opcional: Redirecionar automaticamente
      // window.location.href = data.checkoutUrl;
    } else {
      throw new Error("Link de pagamento não retornado.");
    }

    } catch (err: any) {
      console.error("Erro ao gerar pagamento:", err);
      setError(err.message || "Erro desconhecido");
      
      // MOCK FALLBACK (Para testes locais sem Edge Function)
      toast.warning("Modo de teste: Simulando link de pagamento...");
      setTimeout(async () => {
        setCheckoutUrl("https://mercadopago.com.br/checkout/sample-link-mock");
        await (supabase.from('matches') as any)
          .update({ status: 'waiting_payment' })
          .eq('id', match.id);
        setLoadingPayment(false);
      }, 1500);
      return;
    } finally {
      setLoadingPayment(false);
    }
  };

  // Simula pagamento aprovado (apenas para testes locais)
 const handleMockSuccess = async () => {
    if (!match) return;
    toast.loading("Confirmando pagamento (Simulação)...");
    
    try {
      // Usamos 'as any' logo após o .from('tabela') para liberar o acesso
      await (supabase.from('payments') as any)
        .update({ status: 'approved' })
        .eq('reserva_id', match.id);
      
      await (supabase.from('matches') as any)
        .update({ status: 'confirmed' })
        .eq('id', match.id);
      
      toast.dismiss();
      toast.success("Pagamento confirmado! Aguardando aceite do árbitro.");
      navigate(`/partida/${match.id}`);
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao simular confirmação.");
    }
};

  if (loadingMatch) {
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

  return (
    <MobileLayout showNav={false}>
      <div className="px-4 pt-4 pb-6 space-y-6 min-h-screen flex flex-col">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm">Cancelar</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <QrCode size={32} className="text-primary" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento</h1>
            <p className="text-muted-foreground mt-1">Finalize a contratação do árbitro</p>
          </div>

          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="text-xl font-bold text-foreground">R$ {match.price.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="text-left text-xs space-y-2">
              <p><span className="text-muted-foreground">Modalidade:</span> <span className="font-medium capitalize">{match.modality.replace('_', ' ')}</span></p>
              <p><span className="text-muted-foreground">Data:</span> <span className="font-medium">{new Date(match.date).toLocaleDateString()} às {match.time.slice(0,5)}</span></p>
              <p className="text-xs text-slate-500">Valor retido em Escrow até o término da partida.</p>
            </div>
          </div>

          {!checkoutUrl ? (
            <div className="w-full max-w-sm space-y-3">
              <Button 
                size="lg" 
                className="w-full font-bold text-base h-12" 
                onClick={handleGeneratePayment}
                disabled={loadingPayment}
              >
                {loadingPayment ? <Loader2 className="animate-spin mr-2" /> : <QrCode className="mr-2" />}
                {loadingPayment ? "Gerando PIX..." : "Gerar Pagamento PIX"}
              </Button>
              {error && (
                <div className="text-xs text-destructive flex items-center justify-center gap-1 bg-destructive/10 p-2 rounded">
                  <AlertCircle size={12} />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-4 rounded-xl border-2 border-primary/20 flex flex-col items-center gap-2">
                 <p className="text-xs text-slate-500 font-mono break-all text-center leading-tight">
                   {checkoutUrl}
                 </p>
                 <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => {
                   navigator.clipboard.writeText(checkoutUrl);
                   toast.success("Link copiado!");
                 }}>
                   <Copy size={12} /> Copiar Link
                 </Button>
              </div>

              <Button 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                onClick={() => window.location.href = checkoutUrl}
              >
                Pagar no Mercado Pago
              </Button>

              <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Teste Local</span></div>
              </div>

              <Button 
                variant="outline"
                className="w-full border-dashed"
                onClick={handleMockSuccess}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Simular Pagamento Aprovado
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default PaymentScreen;