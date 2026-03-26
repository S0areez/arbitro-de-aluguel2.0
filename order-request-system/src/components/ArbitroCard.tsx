import { Database } from "@/types/database.types";
import { LevelBadge } from "./LevelBadge";
import { RatingStars } from "./RatingStars";
import { MapPin, BadgeCheck, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const ArbitroCard = ({ arbitro }: { arbitro: Profile }) => {
  const navigate = useNavigate();

  const handleContratarArbitro = (e: React.MouseEvent, arbitro: Profile) => {
    e.stopPropagation(); // Evita navegar para os detalhes ao clicar no botão
    // Redireciona para o Checkout onde o usuário preenche os dados
    navigate(`/checkout/${arbitro.id}`);
  };

  return (
    <div
      onClick={() => navigate(`/arbitro/${arbitro.id}`)}
      className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-blue-500/40 hover:bg-slate-900/70 cursor-pointer shadow-sm"
    >
      <img
        src={arbitro.avatar_url || "https://github.com/shadcn.png"}
        alt={arbitro.full_name || "Árbitro"}
        className="h-16 w-16 rounded-full border-2 border-slate-800 bg-slate-800 object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display font-semibold text-foreground truncate">{arbitro.full_name}</h3>
          <LevelBadge nivel={arbitro.level || "bronze"} />
        </div>

        {/* Social Proof Badges */}
        <div className="flex items-center gap-2 mb-2">
            {(arbitro.rating_avg || 0) >= 4.5 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                    <Medal size={10} /> Top Rated
                </span>
            )}
            {(arbitro.games_count || 0) > 5 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full border border-blue-500/20">
                    <BadgeCheck size={10} /> Verificado
                </span>
            )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
          <MapPin size={12} />
          <span>{arbitro.city || "Não informado"}</span>
          <span className="mx-1">•</span>
          <span className="font-medium text-foreground">{arbitro.games_count || 0} partidas</span>
        </div>
        <div className="flex items-center justify-between">
          <RatingStars rating={arbitro.rating_avg || 0} size={14} />
          <span className="text-sm font-bold text-cyan-400">R$ {arbitro.hourly_rate || 0}/h</span>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-1">
            {arbitro.modalities?.map((m) => (
              <span key={m} className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 capitalize">
                {m}
              </span>
            ))}
          </div>
          <Button 
            onClick={(e) => handleContratarArbitro(e, arbitro)}
            size="sm"
            className="h-8 rounded-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs"
          >
            Contratar
          </Button>
        </div>
      </div>
    </div>
  );
};
