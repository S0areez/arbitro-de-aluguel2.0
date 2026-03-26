import { serve } from 'std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

// Definição dos tipos para a requisição e resposta
interface MatchData {
  refereeId: string;
  matchLocation: { lat: number; lon: number };
  matchDifficulty: 'amistoso' | 'campeonato' | 'final';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { refereeId, matchLocation, matchDifficulty }: MatchData = await req.json()

    // Lógica de cálculo do preço (placeholder)
    const basePrice = 50; // Valor base para qualquer partida
    let finalPrice = basePrice;

    // Exemplo de lógica de negócio
    // 1. Adicional por dificuldade
    const difficultyMultiplier = {
      amistoso: 1.0,
      campeonato: 1.2,
      final: 1.5,
    };
    finalPrice *= difficultyMultiplier[matchDifficulty];

    // 2. Lógica de distância (a ser implementada com Google Matrix API)
    // Por enquanto, um valor fixo para simular
    const distanceCost = 15; // Custo simbólico de deslocamento
    finalPrice += distanceCost;

    // 3. Multiplicador por nível do árbitro (a ser buscado do DB)
    // Placeholder
    const refereeLevelMultiplier = 1.1; // Simula um árbitro de nível mais alto
    finalPrice *= refereeLevelMultiplier;

    return new Response(
      JSON.stringify({ price: finalPrice.toFixed(2) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
