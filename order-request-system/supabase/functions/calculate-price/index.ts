import { serve } from 'std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchData {
  refereeId: string;
  modality: string;
  duration: number;
  matchLocation?: { lat: number; lon: number };
  matchDifficulty: 'amistoso' | 'campeonato' | 'final';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { refereeId, modality, duration, matchDifficulty }: MatchData = await req.json()

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

    // 2. Buscar o nível do árbitro na tabela 'profiles' (para compatibilidade, mas não usado no cálculo)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', refereeId)
      .single()

    if (profileError || !profile) {
      throw new Error('Árbitro não encontrado ou erro ao buscar perfil.')
    }

    // 3. Regra de Dificuldade da Partida (aplicada sobre o preço fixo)
    const difficultyMultipliers = {
      'amistoso': 1.0,
      'campeonato': 1.3,
      'final': 1.6
    }
    const difficultyMultiplier = difficultyMultipliers[matchDifficulty] || 1.0

    // Taxa de deslocamento fixa (até integrarmos com Google Matrix)
    const taxaDeslocamento = 10.00

    // Cálculo Final: (Preço Fixo * Multiplicador Dificuldade) + Taxa Deslocamento
    const subtotal = basePrice * difficultyMultiplier
    const totalPrice = subtotal + taxaDeslocamento

    return new Response(
      JSON.stringify({
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
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
