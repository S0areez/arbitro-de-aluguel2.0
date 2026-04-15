import { MobileLayout } from "@/components/MobileLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches, useUpdateMatch } from "@/hooks/use-supabase";
import { CalendarDays, MapPin, Check, X, User } from "lucide-react";

const Solicitacoes = () => {
  const { user } = useAuth();
  const { data: matches, isLoading } = useMatches(user?.id, "arbitro");
  const updateMatch = useUpdateMatch();

  const sortedMatches = matches?.slice().sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) || [];

  const pendentes = sortedMatches.filter((c) => c.status === "pendente");
  const outras = sortedMatches.filter((c) => c.status !== "pendente");

  const handleAceitar = (id: string) => {
    updateMatch.mutate({ id, updates: { status: "aceita" } });
  };

  const handleRecusar = (id: string) => {
    updateMatch.mutate({ id, updates: { status: "cancelada" } });
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-muted-foreground">Carregando solicitações...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-6 space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Solicitações</h1>

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-primary mb-3">Pendentes ({pendentes.length})</h2>
            <div className="space-y-3">
              {pendentes.map((c) => (
                <div key={c.id} className="rounded-xl border border-primary/30 bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-foreground">{c.modality}</span>
                    <span className="text-lg font-bold text-primary">R$ {c.price}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      {new Date(c.date).toLocaleDateString()} às {c.time.slice(0, 5)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      {c.location}
                    </div>
                    {c.contractor && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        {c.contractor.full_name || "Contratante"}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAceitar(c.id)}
                      disabled={updateMatch.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-sm font-semibold text-success-foreground transition-colors hover:bg-success/90 disabled:opacity-50"
                    >
                      <Check size={16} /> Aceitar
                    </button>
                    <button
                      onClick={() => handleRecusar(c.id)}
                      disabled={updateMatch.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                    >
                      <X size={16} /> Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Outras */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Histórico</h2>
          <div className="space-y-3">
            {outras.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground text-sm">{c.modality}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={11} />
                    {new Date(c.date).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium text-foreground">R$ {c.price}</span>
                </div>
                {c.contractor && (
                   <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                     <User size={11} />
                     <span>{c.contractor.full_name}</span>
                   </div>
                )}
              </div>
            ))}
            {outras.length === 0 && pendentes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
            )}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default Solicitacoes;
