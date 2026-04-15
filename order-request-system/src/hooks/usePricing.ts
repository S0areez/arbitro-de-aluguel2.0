import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PricingDetails {
  category: string;
  base_price: string;
  duration: number;
  difficulty: string;
  difficulty_multiplier: number;
  taxa_deslocamento: string;
  subtotal: string;
}

export interface PricingResponse {
  price: string;
  details: PricingDetails;
}

export function usePricing(refereeId: string | undefined, modality: string, duration: number, matchDifficulty: string) {
  const [data, setData] = useState<PricingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculatePrice() {
      if (!refereeId || !modality || !duration || !matchDifficulty) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fixed pricing table for the platform
        const FIXED_PRICES: Record<string, Record<number, number>> = {
          'futsal 5x5': {
            1: 38.21,
            1.15: 47.76,
            1.3: 57.31,
            1.45: 66.87,
            2: 76.42
          },
          'society 6x6/7x7': {
            1: 41.99,
            1.15: 52.49,
            1.3: 62.98,
            1.45: 73.48,
            2: 83.98
          },
          'campo 11x11': {
            1: 45.77,
            1.15: 57.21,
            1.3: 68.65,
            1.45: 80.10,
            2: 91.54
          }
        };

        // Normalize modality name
        const normalizedModality = modality.toLowerCase().trim();

        // Find the matching category
        let categoryKey = '';
        if (normalizedModality.includes('futsal') || normalizedModality.includes('5x5')) {
          categoryKey = 'futsal 5x5';
        } else if (normalizedModality.includes('society') || normalizedModality.includes('6x6') || normalizedModality.includes('7x7')) {
          categoryKey = 'society 6x6/7x7';
        } else if (normalizedModality.includes('campo') || normalizedModality.includes('11x11')) {
          categoryKey = 'campo 11x11';
        } else {
          // Default to futsal 5x5 if no match
          categoryKey = 'futsal 5x5';
        }

        // Get the fixed price for the duration, or interpolate if needed
        const categoryPrices = FIXED_PRICES[categoryKey];
        let basePrice = categoryPrices[duration];

        // If exact duration not found, find the closest
        if (!basePrice) {
          const availableDurations = Object.keys(categoryPrices).map(Number).sort((a, b) => a - b);
          const closestDuration = availableDurations.reduce((prev, curr) =>
            Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
          );
          basePrice = categoryPrices[closestDuration];
        }

        // Regra de Dificuldade da Partida (aplicada sobre o preço fixo)
        const difficultyMultipliers = {
          'amistoso': 1.0,
          'campeonato': 1.3,
          'final': 1.6
        }
        const difficultyMultiplier = difficultyMultipliers[matchDifficulty as keyof typeof difficultyMultipliers] || 1.0

        // Taxa de deslocamento fixa
        const taxaDeslocamento = 10.00

        // Cálculo Final: (Preço Fixo * Multiplicador Dificuldade) + Taxa Deslocamento
        const subtotal = basePrice * difficultyMultiplier
        const totalPrice = subtotal + taxaDeslocamento

        const response: PricingResponse = {
          price: totalPrice.toFixed(2),
          details: {
            category: categoryKey,
            base_price: basePrice.toFixed(2),
            duration: duration,
            difficulty: matchDifficulty,
            difficulty_multiplier: difficultyMultiplier,
            taxa_deslocamento: taxaDeslocamento.toFixed(2),
            subtotal: subtotal.toFixed(2)
          }
        };

        setData(response);
      } catch (err: any) {
        console.error('Error calculating price:', err);
        setError(err.message || 'Erro ao calcular preço');
      } finally {
        setIsLoading(false);
      }
    }

    calculatePrice();
  }, [refereeId, modality, duration, matchDifficulty]);

  return { data, isLoading, error };
}
