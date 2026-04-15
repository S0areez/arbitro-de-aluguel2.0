import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PricingDetails {
  base_rate: number;
  level: string;
  level_multiplier: number;
  difficulty: string;
  difficulty_multiplier: number;
  taxa_deslocamento: string;
  subtotal: string;
}

export interface PricingResponse {
  price: string;
  details: PricingDetails;
}

export function usePricing(refereeId: string | undefined, matchDifficulty: string) {
  const [data, setData] = useState<PricingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculatePrice() {
      if (!refereeId || !matchDifficulty) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: response, error: functionError } = await supabase.functions.invoke('calculate-match-price', {
          body: { refereeId, matchDifficulty },
        });

        if (functionError) throw functionError;
        setData(response);
      } catch (err: any) {
        console.error('Error calculating price:', err);
        setError(err.message || 'Erro ao calcular preço');
      } finally {
        setIsLoading(false);
      }
    }

    calculatePrice();
  }, [refereeId, matchDifficulty]);

  return { data, isLoading, error };
}
