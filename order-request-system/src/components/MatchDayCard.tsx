import { useEffect, useState } from "react";
import { Navigation, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchWithDetails } from "@/hooks/use-supabase";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MatchDayCardProps {
  match: MatchWithDetails;
}

export const MatchDayCard = ({ match }: MatchDayCardProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(match.referee_checkin || false);

  useEffect(() => {
    if (match.referee_checkin) setCheckedIn(true);
  }, [match.referee_checkin]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const matchDate = new Date(`${match.date}T${match.time}`);
      const now = new Date();
      const diff = matchDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Partida em andamento ou iniciada");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${hours}h ${minutes}m para o início`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [match]);

  const handleGPS = () => {
    if (!match.location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;
    window.open(url, "_blank");
  };

  const handleCheckIn = () => {
    if (checkedIn) return;
    
    setCheckingIn(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { error } = await (supabase
              .from('matches') as any)
              .update({ referee_checkin: true })
              .eq('id', match.id);

            if (error) throw error;
            
            setCheckedIn(true);
            toast.success("Check-in realizado com sucesso! Localização confirmada.");
          } catch (error) {
            console.error(error);
            toast.error("Erro ao realizar check-in no sistema.");
          } finally {
            setCheckingIn(false);
          }
        },
        (error) => {
          setCheckingIn(false);
          toast.error("Erro ao obter localização. Verifique se o GPS está ativado.");
        }
      );
    } else {
      setCheckingIn(false);
      toast.error("Geolocalização não suportada neste dispositivo.");
    }
  };

  return (
    <Card className="border-primary/50 bg-primary/5 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg font-bold text-primary">
          <span>Match Day ⚽</span>
          <span className="text-xs font-normal bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">
            Em breve
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{match.modality}</h3>
            <p className="text-sm text-muted-foreground">{match.location}</p>
          </div>
          <div className="text-right">
             <div className="text-2xl font-bold font-mono text-foreground">
               {match.time.slice(0, 5)}
             </div>
             <p className="text-xs text-primary font-medium">{timeLeft}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleGPS} variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10">
            <Navigation size={16} className="mr-2" />
            GPS
          </Button>
          <Button 
            onClick={handleCheckIn} 
            disabled={checkingIn || checkedIn} 
            className={`w-full ${checkedIn ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {checkingIn ? (
              "Verificando..."
            ) : checkedIn ? (
              <>
                <CheckCircle size={16} className="mr-2" />
                Confirmado
              </>
            ) : (
              <>
                <CheckCircle size={16} className="mr-2" />
                Check-in
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
