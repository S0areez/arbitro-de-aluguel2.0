import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useCreateMatch } from "@/hooks/use-supabase";
import { ArrowLeft, MapPin, CalendarDays, Clock, CreditCard, Smartphone, Wallet, Timer, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database } from "@/types/database.types";
import { calculateMatchPrice } from "@/utils/pricing";
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

  const pagamentoOptions: { id: PaymentMethod; icon: any; label: string }[] = [
    { id: "pix", icon: Smartphone, label: "PIX" },
    { id: "cartao", icon: CreditCard, label: "Cartão" },
    { id: "saldo", icon: Wallet, label: "Saldo" },
  ];

 // Para a tabela matches
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
    status: 'Pending', // Garanta que 'Pending' exista no seu Enum do Banco
    payment_method: pagamento,
    platform_fee: platformFee,
    is_surge: isSurge,
    duration: duration,
    contractor_lat: profile.current_lat ?? null,
    contractor_lng: profile.current_lng ?? null,
  } as Database['public']['Tables']['matches']['Insert']) // Força o tipo de inserção
  .select('id')
  .single();

// Para a tabela payments
const { error: paymentError } = await supabase
  .from('payments')
  .insert({
    reserva_id: createdMatch.id,
    user_id: user.id,
    status: 'pending',
    amount: valorTotal,
    external_reference: createdMatch.id
  } as Database['public']['Tables']['payments']['Insert']) // Força o tipo de inserção

  // ... (Restante do JSX permanece igual ao seu)
  return (
    <MobileLayout showNav={false}>
       {/* O JSX que você já tem funciona bem */}
    </MobileLayout>
  );
};

export default Checkout;