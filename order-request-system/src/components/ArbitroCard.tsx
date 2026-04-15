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
      className="relative flex flex-row items-start rounded-[24px] bg-slate-950 border border-slate-800 p-5 pb-14 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.28)] transition hover:shadow-lg"
    >
      <div className="flex-shrink-0">
        <img
          src={arbitro.avatar_url || "/assets/default-avatar.png"}
          alt={arbitro.full_name || "Árbitro"}
          className="h-16 w-16 rounded-[12px] object-cover"
        />
      </div>

      <div className="ml-4 flex flex-1 flex-col">
        <h3 className="text-[18px] font-bold text-white mb-1.5 truncate">{arbitro.full_name}</h3>
        <div className="mb-2">
          <RatingStars rating={arbitro.rating_avg || 0} size={14} color="#FFD700" />
        </div>
        <div className="flex flex-wrap gap-2">
          {arbitro.is_verified && (
            <span className="inline-flex items-center rounded-[20px] bg-slate-800 px-3 py-1 text-[12px] font-medium text-slate-300">
              Verificado
            </span>
          )}
          <span className="inline-flex items-center rounded-[20px] bg-slate-800 px-3 py-1 text-[12px] font-medium text-slate-300">
            {(arbitro.level || 'Prata').toString().replace(/^(\w)/, (c) => c.toUpperCase())}
          </span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <Button
          onClick={(e) => handleContratarArbitro(e, arbitro)}
          size="sm"
          className="rounded-[24px] bg-[#0F172A] px-6 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          Contratar
        </Button>
      </div>
    </div>
  );
};
