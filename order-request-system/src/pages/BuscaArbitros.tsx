import { useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { ArbitroCard } from "@/components/ArbitroCard";
import { Search, SlidersHorizontal, X, Calendar as CalendarIcon } from "lucide-react";
import { useReferees } from "@/hooks/use-supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const modalidades = [
  { label: "Futebol Campo", value: "futebol" },
  { label: "Futsal", value: "futsal" },
  { label: "Society", value: "society" },
  { label: "Futebol 7", value: "futebol_7" }
];
const equipmentOptions = ["Placar", "Cronômetro", "Cartões", "Apito", "Súmula"];

const BuscaArbitros = () => {
  const [query, setQuery] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<string | null>(null);
  const [filtroEquipamento, setFiltroEquipamento] = useState<string[]>([]);
  const [date, setDate] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);
  const [precoMax, setPrecoMax] = useState(200);

  const { data: referees, isLoading } = useReferees();

  const filtered = referees?.filter((a) => {
    if (query && !a.full_name?.toLowerCase().includes(query.toLowerCase()) && !a.city?.toLowerCase().includes(query.toLowerCase())) return false;
    if (filtroModalidade && !a.modalities?.some(mod => mod.toLowerCase() === filtroModalidade)) return false;
    if (filtroEquipamento.length > 0) {
        // Check if referee has ALL selected equipment
        const hasAll = filtroEquipamento.every(req => a.equipment?.includes(req));
        if (!hasAll) return false;
    }
    if ((a.hourly_rate || 0) > precoMax) return false;
    
    // Check availability
    if (date && a.unavailable_dates) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      if (a.unavailable_dates.includes(formattedDate)) return false;
    }

    return true;
  }) || [];

  return (
    <MobileLayout>
      <div className="px-4 pt-6 space-y-4">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-black">Buscar Árbitros</h1>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur-sm">
              <Search size={16} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome ou cidade..."
                className="flex-1 bg-transparent text-sm placeholder:text-slate-300 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")}><X size={14} /></button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[50px] justify-center rounded-full bg-white/10 text-white hover:bg-white/15 hover:text-white",
                    !date && "opacity-90"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors ${
                showFilters ? "bg-cyan-500 text-white" : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {date && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Filtrando para: <span className="font-semibold text-foreground">{format(date, "dd 'de' MMMM", { locale: ptBR })}</span></span>
            <button onClick={() => setDate(undefined)} className="text-blue-600 hover:underline">Limpar data</button>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 shadow-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Equipamento Próprio</label>
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                        if (filtroEquipamento.includes(item)) {
                            setFiltroEquipamento(filtroEquipamento.filter(e => e !== item));
                        } else {
                            setFiltroEquipamento([...filtroEquipamento, item]);
                        }
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                      filtroEquipamento.includes(item)
                        ? "bg-cyan-500 text-white border-cyan-500"
                        : "bg-slate-800 text-slate-300 border-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Modalidade</label>
              <div className="flex flex-wrap gap-2">
                {modalidades.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setFiltroModalidade(filtroModalidade === m.value ? null : m.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      filtroModalidade === m.value
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Preço máximo: <span className="text-cyan-500">R$ {precoMax}/h</span>
              </label>
              <input
                type="range"
                min={50}
                max={200}
                value={precoMax}
                onChange={(e) => setPrecoMax(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{filtered.length} árbitro{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
            <div className="space-y-3 pb-4">
              {filtered.map((a) => (
                <ArbitroCard key={a.id} arbitro={a} />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum árbitro encontrado.</p>
              )}
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default BuscaArbitros;
