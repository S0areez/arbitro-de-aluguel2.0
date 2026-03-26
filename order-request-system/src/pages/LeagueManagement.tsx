import { useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { calculateMatchPrice } from "@/utils/pricing";
import { Database } from "@/types/database.types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];

const LeagueManagement = () => {
  const { user } = useAuth();
  const [csvData, setCsvData] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ total: number; success: number; failed: number; matched: number } | null>(null);

  const normalizeModality = (input: string): string => {
    const lower = input.toLowerCase().trim();
    if (lower.includes("futsal")) return "futsal";
    if (lower.includes("campo") || lower === "futebol") return "futebol";
    if (lower.includes("society")) return "society";
    if (lower.includes("futebol 7") || lower.includes("futebol_7")) return "futebol_7";
    // Fallback: lowercase and replace spaces with underscores
    return lower.replace(/ /g, '_');
  };

  const handleProcess = async () => {
    console.log("League Management v3 Loaded");
    
    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }

    if (!csvData.trim()) {
      toast.error("Cole os dados dos jogos primeiro.");
      return;
    }

    setProcessing(true);
    setResults(null);
    const lines = csvData.trim().split("\n");
    let successCount = 0;
    let failCount = 0;
    let matchedCount = 0;

    // Fetch contractor city for local matching
    const { data: contractorData } = await supabase
      .from("profiles")
      .select("city")
      .eq("id", user.id)
      .single();
    
    const contractorProfile = contractorData as { city: string | null } | null;
    const contractorCity = contractorProfile?.city;
    console.log("Contractor City:", contractorCity);

    // Fetch all referees once to optimize
    const { data: refereesData, error: refError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "arbitro");
    
    const referees = (refereesData as Profile[]) || [];

    if (refError || !referees) {
      toast.error("Erro ao buscar árbitros disponíveis.");
      setProcessing(false);
      return;
    }

    // Fetch all future matches to check availability
    const { data: matchesData } = await supabase
      .from("matches")
      .select("referee_id, date, time, duration")
      .in("status", ["aceita", "a_caminho", "em_andamento"]);
    
    const existingMatches = (matchesData as Partial<Match>[]) || [];

    for (const line of lines) {
      try {
        const [date, time, location, modalityRaw, durationStr] = line.split(",").map(s => s.trim());
        
        if (!date || !time || !location || !modalityRaw) {
          console.warn("Skipping invalid line:", line);
          failCount++;
          continue;
        }

        const modality = normalizeModality(modalityRaw);
        console.log(`Processing: ${modalityRaw} -> ${modality}`); // Debug log
        const duration = parseInt(durationStr || "1");

        // Advanced Availability Algorithm
        const availableReferees = referees.filter(ref => {
          // 1. Modality Match
          // Case-insensitive check
          if (!ref.modalities?.some(m => m.toLowerCase() === modality)) return false;
          
          // 2. City Match (if contractor has city defined)
          // Only match referees in the same city to reduce travel costs/issues
          if (contractorCity && ref.city && ref.city !== contractorCity) return false;

          // 3. Schedule Conflict
          const hasConflict = existingMatches?.some(m => {
            if (m.referee_id !== ref.id) return false;
            if (m.date !== date) return false;
            
            // Simple time check (assuming 1 hour duration if not specified)
            // Ideally should check time ranges
            return m.time === time; 
          });

          return !hasConflict;
        });

        // Pick the best referee (Random for fairness among available)
        const selectedReferee = availableReferees.length > 0 
          ? availableReferees[Math.floor(Math.random() * availableReferees.length)] 
          : null;

        // Calculate Price
        const hourlyRate = selectedReferee?.hourly_rate || 50; // Default base if no referee
        const { totalPrice, platformFee, isSurge } = calculateMatchPrice(hourlyRate, duration, date, time);

        // Insert Match
        const matchData: any = {
          contractor_id: user.id,
          referee_id: selectedReferee?.id || null, // Null means "Open Match"
          date,
          time,
          location,
          modality,
          price: totalPrice,
          platform_fee: platformFee,
          is_surge: isSurge,
          duration,
          status: selectedReferee ? "pendente" : "pendente", 
          payment_method: "pix", 
        };

        const { error } = await supabase.from("matches").insert(matchData);

        if (error) throw error;
        successCount++;
        if (selectedReferee) matchedCount++;

      } catch (err) {
        console.error("Error processing line:", line, err);
        failCount++;
      }
    }

    setResults({ total: lines.length, success: successCount, failed: failCount, matched: matchedCount });
    setProcessing(false);
    if (successCount > 0) {
      toast.success(`${successCount} jogos criados (${matchedCount} com árbitro)!`);
    } else {
      toast.error("Nenhum jogo foi criado. Verifique o formato.");
    }
  };

  return (
    <MobileLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Gestão de Ligas (B2B)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre múltiplos jogos de uma vez e deixe o sistema encontrar os árbitros.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4 text-primary" />
            Importação em Lote (CSV)
          </div>
          
          <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg border border-border/50">
            <p className="font-semibold mb-1">Formato esperado (por linha):</p>
            <code className="block font-mono text-xs">
              YYYY-MM-DD, HH:MM, Local, Modalidade, Duração(h)
            </code>
            <p className="mt-2">Exemplo:</p>
            <code className="block font-mono text-xs text-primary">
              2024-03-10, 09:00, Arena XP, Futsal, 1<br/>
              2024-03-10, 10:00, Arena XP, Futsal, 1
            </code>
          </div>

          <Textarea 
            placeholder="Cole sua lista de jogos aqui..." 
            className="min-h-[200px] font-mono text-sm"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />

          <Button 
            onClick={handleProcess} 
            disabled={processing || !csvData} 
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
              </>
            ) : (
              "Processar Lote e Buscar Árbitros"
            )}
          </Button>
        </div>

        {results && (
          <div className={`p-4 rounded-xl border ${results.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              {results.failed === 0 ? <CheckCircle2 className="text-green-600 w-4 h-4" /> : <AlertCircle className="text-orange-600 w-4 h-4" />}
              Resultado da Importação
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <span className="block font-bold text-gray-700">{results.total}</span>
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <div>
                <span className="block font-bold text-green-600">{results.success}</span>
                <span className="text-xs text-gray-500">Criados</span>
              </div>
              <div>
                <span className="block font-bold text-blue-600">{results.matched}</span>
                <span className="text-xs text-gray-500">Com Árbitro</span>
              </div>
              <div>
                <span className="block font-bold text-red-600">{results.failed}</span>
                <span className="text-xs text-gray-500">Falhas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default LeagueManagement;
