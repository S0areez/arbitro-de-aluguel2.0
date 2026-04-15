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


interface MatchData {
  refereeId: string;
  matchLocation?: { lat: number; lon: number };
  matchDifficulty: 'amistoso' | 'campeonato' | 'final';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
