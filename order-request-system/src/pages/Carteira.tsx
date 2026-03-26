import { MobileLayout } from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/use-supabase";
import { ArrowDownLeft, ArrowUpRight, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect } from "react";

const Carteira = () => {
  const { user } = useAuth();
  const { data: transactions, isLoading } = useTransactions(user?.id);

 useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');

  if (status === 'success') {
    toast.success("Pagamento aprovado! Sua reserva está confirmada.");
    // Limpa os parâmetros da URL para não repetir o toast ao dar F5
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (status === 'pending') {
    toast.info("Seu pagamento está sendo processado. Assim que aprovado, seu saldo será atualizado.");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (status === 'error' || status === 'failure') {
    toast.error("O pagamento não foi concluído. Tente novamente.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);

  const entradas = transactions?.filter((t) => t.type === "entrada").reduce((acc, t) => acc + t.amount, 0) || 0;
  const saidas = transactions?.filter((t) => t.type === "saque" || t.type === "saida").reduce((acc, t) => acc + t.amount, 0) || 0;
  const saldo = entradas - saidas;

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-6 space-y-6">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-black">Carteira</h1>
          </div>
          <div className="mt-3 rounded-2xl p-6 bg-black/10">
            <p className="text-xs opacity-90 mb-1">Saldo disponível</p>
            <p className="text-3xl font-black">R$ {saldo.toFixed(2)}</p>
            <Button
              onClick={() => toast.success("Saque solicitado! (Demo)")}
              size="sm"
              className="mt-4 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white border-0"
            >
              <Banknote size={16} /> Sacar via PIX
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <ArrowDownLeft size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Entradas</p>
              <p className="text-sm font-bold text-foreground">R$ {entradas.toFixed(2)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-pink-500/15 flex items-center justify-center">
              <ArrowUpRight size={18} className="text-pink-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Saques</p>
              <p className="text-sm font-bold text-foreground">R$ {saidas.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Extrato</h2>
          <div className="space-y-2">
            {transactions?.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-sm">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === "entrada" ? "bg-emerald-500/15" : "bg-pink-500/15"}`}>
                  {t.type === "entrada" ? (
                    <ArrowDownLeft size={14} className="text-emerald-400" />
                  ) : (
                    <ArrowUpRight size={14} className="text-pink-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{t.description || "Transação"}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-bold ${t.type === "entrada" ? "text-emerald-400" : "text-pink-400"}`}>
                  {t.type === "entrada" ? "+" : "-"}R$ {t.amount.toFixed(2)}
                </span>
              </div>
            ))}
            {transactions?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação encontrada.</p>
            )}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default Carteira;
