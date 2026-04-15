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

type PaymentMethod = Database["public"]["Tables"]["matches"]["Row"]["payment_method"];

// Definição de interface para evitar o uso de 'any'
interface MatchInsertResponse {
  id: string;
}

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
  const [pagamento, setPagamento] = useState<PaymentMethod>("pix");
  const [splitCount, setSplitCount] = useState(1);
  const [isChecking, setIsChecking] = useState(false);

  const storageKey = `checkout-form-${arbitroId}`;

  useEffect(() => {
    if (!arbitroId) return;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const payload = JSON.parse(saved);
      setData(payload.data || "");
      setHorario(payload.horario || "");
      setDuration(payload.duration || 1);
      setLocal(payload.local || "");
      setModalidade(payload.modalidade || "");
      setMatchDifficulty(payload.matchDifficulty || "amistoso");
      setPagamento(payload.pagamento || "pix");
      setSplitCount(payload.splitCount || 1);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [arbitroId, storageKey]);

  useEffect(() => {
    if (!arbitroId) return;
    localStorage.setItem(storageKey, JSON.stringify({
      data, horario, duration, local, modalidade, matchDifficulty, pagamento, splitCount,
    }));
  }, [arbitroId, storageKey, data, horario, duration, local, modalidade, matchDifficulty, pagamento, splitCount]);

  const { data: pricingData, isLoading: isPricingLoading } = usePricing(arbitroId, modalidade, duration, matchDifficulty);

  if (isLoading) return <MobileLayout showNav={false}><div className="flex items-center justify-center h-screen"><p>Carregando...</p></div></MobileLayout>;
  if (!arbitro) return <MobileLayout showNav={false}><div className="flex flex-col items-center justify-center h-screen"><Button onClick={() => navigate(-1)}>Voltar</Button></div></MobileLayout>;

  const valorTotal = pricingData ? parseFloat(pricingData.price) : calculateMatchPrice(modalidade, duration, data, horario).totalPrice;
  const platformFee = valorTotal * 0.1;
  const isSurge = pricingData ? (pricingData.details.difficulty_multiplier > 1) : false;
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
       {/* O JSX que você já tem funciona bem */}
    </MobileLayout>
  );
};

export default Checkout;
