import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useCreateMatch } from "@/hooks/use-supabase";
import { ArrowLeft, MapPin, CalendarDays, Clock, CreditCard, Smartphone, Wallet, Timer, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database } from "@/types/database.types";
import { calculateMatchPrice } from "@/utils/pricing";

type PaymentMethod = Database["public"]["Tables"]["matches"]["Row"]["payment_method"];

import { supabase } from "@/integrations/supabase/client";

import { usePricing } from "@/hooks/usePricing";
import { Skeleton } from "@/components/ui/skeleton";

const Checkout = () => {
  const { arbitroId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  // Fetch referee data
  const { data: arbitro, isLoading } = useProfile(arbitroId);
  const createMatch = useCreateMatch();

  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [duration, setDuration] = useState(1);
  const [local, setLocal] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [matchDifficulty, setMatchDifficulty] = useState<"amistoso" | "campeonato" | "final">("amistoso");
  const [pagamento, setPagamento] = useState<PaymentMethod>("pix");
  const [splitCount, setSplitCount] = useState(1);
  const [isChecking, setIsChecking] = useState(false);

  // Hook de Precificação Dinâmica via Edge Function
  const { data: pricingData, isLoading: isPricingLoading } = usePricing(arbitroId, matchDifficulty);

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!arbitro) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <p className="text-muted-foreground">Árbitro não encontrado.</p>
          <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </MobileLayout>
    );
  }

  const hourlyRate = arbitro.hourly_rate || 0;
  
  // Usar o preço da Edge Function se disponível, senão fallback para o cálculo local
  const valorTotal = pricingData ? parseFloat(pricingData.price) : (hourlyRate * duration);
  const platformFee = pricingData ? (valorTotal * 0.1) : (valorTotal * 0.1); // Exemplo de taxa
  const isSurge = pricingData ? (pricingData.details.level_multiplier > 1 || pricingData.details.difficulty_multiplier > 1) : false;
  
  const valorPorPessoa = splitCount > 1 ? (valorTotal / splitCount).toFixed(2) : null;

  const pagamentoOptions: { id: PaymentMethod; icon: typeof Smartphone; label: string }[] = [
    { id: "pix", icon: Smartphone, label: "PIX" },
    { id: "cartao", icon: CreditCard, label: "Cartão" },
    { id: "saldo", icon: Wallet, label: "Saldo" },
  ];

  const handleConfirm = async () => {
  if (!user || !profile) {
    toast.error("Usuário não autenticado.");
    return;
  }
  
  if (!data || !horario || !local || !modalidade) {
    toast.error("Preencha todos os campos obrigatórios.");
    return;
  }

  setIsChecking(true);
  const loadingToast = toast.loading("Criando reserva e gerando pagamento...");

  try {
    const finalModality = modalidade.toLowerCase().trim().replace(/ /g, '_');

    // SOLUÇÃO: Usamos 'as any' no insert para ignorar o erro de 'never', 
    // mas capturamos o retorno tipando-o manualmente para podermos usar o .id
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert({
        contractor_id: user.id,
        referee_id: arbitro.id,
        date: data,
        time: horario,
        location: local,
        modality: finalModality,
        price: valorTotal,
          // MUDANÇA: Status inicial agora é 'cancelada' (usado como 'aguardando_pagamento')
          // para que o árbitro não veja até que o pagamento seja confirmado.
          // Quando o pagamento for confirmado, mudaremos para 'pendente'.
          status: 'cancelada', 
          payment_method: pagamento,
          platform_fee: platformFee,
        is_surge: isSurge,
        duration: duration
      } as any) // Força a inserção
      .select()
      .single();

    if (matchError) throw matchError;
    
    // Fazemos um "cast" rápido para o TS saber que o id existe no retorno
    const createdMatch = matchData as { id: string };

    // 3. Criar registro na tabela 'payments'
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        reserva_id: createdMatch.id,
        user_id: user.id,
        status: 'pending',
        amount: valorTotal,
        external_reference: `match_${createdMatch.id}`
      } as any);

    if (paymentError) console.error("Erro no log de pagamento:", paymentError);

    toast.dismiss(loadingToast);
    toast.success("Solicitação criada! Redirecionando para pagamento...");
    
    // Redireciona para a tela de Pagamento Intermediária (PaymentScreen)
    // Lá o usuário poderá gerar o PIX ou simular o pagamento
    navigate(`/payment/${createdMatch.id}`);

  } catch (err: any) {
    console.error("Erro detalhado:", err);
    toast.dismiss(loadingToast);
    toast.error(`Erro: ${err.message || "Tente novamente."}`);
  } finally {
    setIsChecking(false);
  }
};

  return (
    <MobileLayout showNav={false}>
      <div className="px-4 pt-4 pb-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>

        <h1 className="font-display text-2xl font-bold text-foreground">Checkout</h1>

        {/* Árbitro Summary */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <img 
            src={arbitro.avatar_url || "https://github.com/shadcn.png"} 
            alt={arbitro.full_name || "Árbitro"} 
            className="h-12 w-12 rounded-full border-2 border-border bg-muted object-cover" 
          />
          <div>
            <h3 className="font-semibold text-foreground">{arbitro.full_name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin size={10} />
              {arbitro.city || "Localização não informada"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <span className="block text-lg font-bold text-primary">R$ {valorTotal}</span>
            <span className="text-xs text-muted-foreground">R$ {hourlyRate}/h</span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><CalendarDays size={12} />Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Clock size={12} />Horário</label>
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Timer size={12} />Duração (h)</label>
            <input type="number" min="1" max="12" value={duration} onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><MapPin size={12} />Local</label>
            <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Campo do Parque..." className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">Modalidade</label>
            <select 
              value={modalidade} 
              onChange={(e) => setModalidade(e.target.value)} 
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Selecione...</option>
              {arbitro.modalities?.map(m => (
                <option key={m} value={m}>{m}</option>
              )) || <option value="Futebol">Futebol</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo de Partida</label>
            <div className="grid grid-cols-3 gap-2">
              {(['amistoso', 'campeonato', 'final'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setMatchDifficulty(diff)}
                  className={`rounded-xl border py-2 text-xs font-medium transition-colors ${
                    matchDifficulty === diff 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Método de Pagamento</label>
          <div className="grid grid-cols-3 gap-2">
            {pagamentoOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPagamento(opt.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors ${
                  pagamento === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                <opt.icon size={20} />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Dividir pagamento</label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setSplitCount(n)}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                  splitCount === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {n === 1 ? "Só eu" : `${n}x`}
              </button>
            ))}
          </div>
          {valorPorPessoa && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              R$ {valorPorPessoa} por pessoa
            </p>
          )}
        </div>

        {/* Resumo de Custos - Dark Premium */}
        <div className="rounded-2xl border border-[#2A2D33] bg-[#141619] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2D33] pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Info size={16} className="text-blue-400" />
              Resumo de Custos
            </h3>
            {isPricingLoading && <div className="animate-pulse h-4 w-20 bg-slate-800 rounded"></div>}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal ({pricingData?.details.level || 'Nível'} x {duration}h)</span>
              {isPricingLoading ? (
                <Skeleton className="h-4 w-16 bg-slate-800" />
              ) : (
                <span className="text-slate-200">R$ {pricingData?.details.subtotal || (hourlyRate * duration).toFixed(2)}</span>
              )}
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                Adicional de Dificuldade
                {pricingData?.details.difficulty_multiplier && pricingData.details.difficulty_multiplier > 1 && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                    +{((pricingData.details.difficulty_multiplier - 1) * 100).toFixed(0)}%
                  </span>
                )}
              </span>
              {isPricingLoading ? (
                <Skeleton className="h-4 w-12 bg-slate-800" />
              ) : (
                <span className="text-slate-200">
                  {pricingData?.details.difficulty_multiplier && pricingData.details.difficulty_multiplier > 1 
                    ? `+ R$ ${(parseFloat(pricingData.details.subtotal) - (parseFloat(pricingData.details.subtotal) / pricingData.details.difficulty_multiplier)).toFixed(2)}`
                    : "R$ 0,00"}
                </span>
              )}
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span>Taxa de Deslocamento</span>
              {isPricingLoading ? (
                <Skeleton className="h-4 w-12 bg-slate-800" />
              ) : (
                <span className="text-slate-200">R$ {pricingData?.details.taxa_deslocamento || "10.00"}</span>
              )}
            </div>

            <div className="pt-3 border-t border-[#2A2D33] flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100">Total Final</span>
              {isPricingLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-800" />
              ) : (
                <span className="text-2xl font-black text-[#E8C547]">
                  R$ {valorTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleConfirm} disabled={createMatch.isPending || isChecking || isPricingLoading} className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20">
          {createMatch.isPending || isChecking ? "Processando..." : "Confirmar Contratação"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Checkout;
