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

<<<<<<< HEAD
=======
interface MatchData {
  refereeId: string;
  matchLocation?: { lat: number; lon: number };
  matchDifficulty: 'amistoso' | 'campeonato' | 'final';
}

>>>>>>> parent of c2702d6 (Exclusao de GPS/Alteracao de valor fixo)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
<<<<<<< HEAD
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
=======
    const { refereeId, matchDifficulty }: MatchData = await req.json()

    // 1. Inicializar cliente Supabase com a Service Role Key para ignorar RLS se necessário
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Buscar o nível do árbitro na tabela 'profiles'
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('level, hourly_rate')
      .eq('id', refereeId)
      .single()

    if (profileError || !profile) {
      throw new Error('Árbitro não encontrado ou erro ao buscar perfil.')
    }

    // 3. Regra de Multiplicadores por Nível
    const levelMultipliers: Record<string, number> = {
      'bronze': 1.0,
      'prata': 1.2,
      'ouro': 1.5,
      'black': 1.8
    }

    const refereeLevel = (profile.level || 'bronze').toLowerCase()
    const levelMultiplier = levelMultipliers[refereeLevel] || 1.0

    // 4. Regra de Dificuldade da Partida
    const difficultyMultipliers = {
      'amistoso': 1.0,
      'campeonato': 1.3,
      'final': 1.6
    }
    const difficultyMultiplier = difficultyMultipliers[matchDifficulty] || 1.0

    // 5. Cálculo do Preço Base
    // Usamos o hourly_rate do árbitro ou um valor padrão de R$ 50,00
    const baseHourlyRate = profile.hourly_rate || 50
    
    // Taxa de deslocamento fixa (até integrarmos com Google Matrix)
    const taxaDeslocamento = 10.00

    // Cálculo Final: (Preço Base * Multiplicador Nível * Multiplicador Dificuldade) + Taxa Deslocamento
    const subtotal = baseHourlyRate * levelMultiplier * difficultyMultiplier
    const totalPrice = subtotal + taxaDeslocamento

    return new Response(
      JSON.stringify({
        price: totalPrice.toFixed(2),
        details: {
          base_rate: baseHourlyRate,
          level: refereeLevel,
          level_multiplier: levelMultiplier,
          difficulty: matchDifficulty,
          difficulty_multiplier: difficultyMultiplier,
          taxa_deslocamento: taxaDeslocamento.toFixed(2),
          subtotal: subtotal.toFixed(2)
        }
      }),
>>>>>>> parent of c2702d6 (Exclusao de GPS/Alteracao de valor fixo)
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
