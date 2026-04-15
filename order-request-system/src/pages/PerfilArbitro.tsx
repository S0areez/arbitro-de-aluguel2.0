import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { LevelBadge } from "@/components/LevelBadge";
import { RatingStars } from "@/components/RatingStars";
import { ArrowLeft, MapPin, Trophy, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile, useReviews } from "@/hooks/use-supabase";

const PerfilArbitro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: arbitro, isLoading: isLoadingProfile } = useProfile(id);
  const { data: reviews, isLoading: isLoadingReviews } = useReviews(id);

  if (isLoadingProfile) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!arbitro) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Árbitro não encontrado.</p>
        </div>
      </MobileLayout>
    );
  }

  const stats = [
    { icon: Trophy, label: "Jogos", value: arbitro.games_count || 0 },
    { icon: Clock, label: "Pontualidade", value: "95%" }, // Mocked for now as it's not in profile
    { icon: CreditCard, label: "Média cartões", value: "2.5" }, // Mocked for now
  ];

  return (
    <MobileLayout showNav={false}>
      <div className="px-4 pt-4 pb-6 space-y-6">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>

        {/* Profile */}
        <div className="flex flex-col items-center text-center">
          <img src={arbitro.avatar_url || "/assets/default-avatar.png"} alt={arbitro.full_name || "Árbitro"} className="h-24 w-24 rounded-full border-4 border-primary/30 bg-muted" />
          <h1 className="font-display text-xl font-bold text-foreground mt-3">{arbitro.full_name}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin size={14} />
            <span>{arbitro.city || "Não informado"}</span>
          </div>
          <div className="mt-2"><LevelBadge nivel={arbitro.level || "bronze"} /></div>
          <div className="mt-2"><RatingStars rating={arbitro.rating_avg || 0} /></div>
        </div>

        {/* Bio */}
        <p className="text-sm text-muted-foreground leading-relaxed">{arbitro.bio || "Sem biografia."}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
              <s.icon size={18} className="text-primary mb-1" />
              <span className="text-lg font-bold text-foreground">{s.value}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Modalidades */}
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground mb-2">Modalidades</h2>
          <div className="flex flex-wrap gap-2">
            {arbitro.modalities?.map((m) => (
              <span key={m} className="rounded-lg bg-secondary px-3 py-1 text-xs text-secondary-foreground">{m}</span>
            ))}
          </div>
        </div>

        {/* Disponibilidade */}
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground mb-2">Disponibilidade</h2>
          <div className="flex flex-wrap gap-2">
            {arbitro.availability?.map((d) => (
              <span key={d} className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-1 text-xs text-primary font-medium">{d}</span>
            ))}
          </div>
        </div>

        {/* Avaliações */}
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground mb-3">Avaliações</h2>
          <div className="space-y-3">
            {isLoadingReviews ? (
              <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
            ) : reviews?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
            ) : (
              reviews?.map((av) => (
                <div key={av.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{av.reviewer?.full_name || "Anônimo"}</span>
                    <RatingStars rating={av.rating} size={12} />
                  </div>
                  <p className="text-xs text-muted-foreground">{av.comment}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1 block">{new Date(av.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 pt-4">
          <Button
            onClick={() => navigate(`/checkout/${arbitro.id}`)}
            className="w-full h-12 text-base font-bold rounded-xl"
          >
            Contratar Árbitro
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default PerfilArbitro;
