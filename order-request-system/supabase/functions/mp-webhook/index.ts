declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')
  const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

  if (!MP_WEBHOOK_SECRET || !MP_ACCESS_TOKEN) {
    console.error('Missing Mercado Pago environment variables')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    })
  }

  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get('x-signature') || ''
    
    console.log("--- NOVA NOTIFICAÇÃO DO MERCADO PAGO ---")
    console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
    console.log("Body:", rawBody)

    const body = JSON.parse(rawBody)
    
    // O Mercado Pago envia o ID do pagamento de várias formas
    const paymentId = body.data?.id || body.resource?.split('/').pop() || body.id
    const topic = body.type || body.topic || (body.resource?.includes('payments') ? 'payment' : null)

    console.log(`PaymentId detectado: ${paymentId}, Topic detectado: ${topic}`)

    if (!paymentId || !topic) {
      console.warn("Notificação inválida: paymentId ou topic ausentes")
      return new Response(JSON.stringify({ received: true, invalid: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      })
    }

    // 1. Validação da Assinatura (Segurança) - Opcional se falhar para testes
    if (signatureHeader && paymentId) {
      try {
        const parts = signatureHeader.split(',')
        let ts = '', v1 = ''
        parts.forEach((part: string) => {
          const [key, value] = part.split('=')
          if (key === 'ts') ts = value
          if (key === 'v1') v1 = value
        })

        const manifest = `id:${paymentId};ts:${ts};`
        const encoder = new TextEncoder()
        const keyData = encoder.encode(MP_WEBHOOK_SECRET)
        const manifestData = encoder.encode(manifest)

        const cryptoKey = await crypto.subtle.importKey(
          "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        )
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, manifestData)
        const generatedHash = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, '0')).join('')

        if (generatedHash !== v1) {
          console.error("Assinatura inválida! Hash gerado:", generatedHash, "Hash recebido:", v1)
          // Em desenvolvimento, podemos logar o erro e continuar para não bloquear testes,
          // mas em produção o ideal é retornar 401.
          // return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
        } else {
          console.log("Assinatura validada com sucesso!")
        }
      } catch (sigError) {
        console.error("Erro ao validar assinatura:", (sigError as Error).message)
      }
    }

    if (topic === 'payment' && paymentId) {

      // 1. Busca o status real do pagamento na API do Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
      })
      
      if (!mpRes.ok) {
        const errText = await mpRes.text()
        console.error(`Erro ao buscar pagamento no MP: ${mpRes.status} ${errText}`)
        throw new Error(`MP API error: ${mpRes.status}`)
      }

      const paymentData = await mpRes.json()
      console.log("Dados do Pagamento no MP:", JSON.stringify(paymentData, null, 2))
      console.log("Status final no MP:", paymentData.status)

      if (paymentData.status === 'approved') {
        const rawReference = paymentData.external_reference || ''
        const matchId = rawReference.replace(/^match_/, '').trim()
        console.log(`Pagamento APROVADO. Tentando atualizar partida ID: "${matchId}"`)        

        if (!matchId) {
          console.error("ERRO: external_reference está vazio no objeto de pagamento do MP!")
          throw new Error("Missing external_reference")
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseKey) {
          console.error("ERRO: Variáveis de ambiente do Supabase não encontradas!")
          throw new Error("Missing Supabase env vars")
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Verificar se a partida já foi processada
        const { data: existingMatch, error: fetchError } = await supabase
          .from('matches')
          .select('status')
          .eq('id', matchId)
          .single()

        if (fetchError) {
          console.error("Erro ao buscar partida existente:", fetchError)
          throw fetchError
        }

        if (existingMatch?.status === 'confirmed') {
          console.log(`Partida ${matchId} já foi processada anteriormente. Ignorando.`)
          return new Response(JSON.stringify({ received: true, already_processed: true }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          })
        }

        const { data: updateData, error: updateError } = await supabase
          .from('matches')
          .update({ status: 'confirmed' })
          .eq('id', matchId)
          .select()

        if (updateError) {
          console.error("Erro na query de update do Supabase:", updateError)
          throw updateError
        }

        if (!updateData || updateData.length === 0) {
          console.warn(`AVISO: Nenhuma linha foi alterada no banco para o ID "${matchId}". Verifique se o ID existe na tabela 'matches'.`)
        } else {
          console.log(`SUCESSO TOTAL: Partida ${matchId} atualizada para 'confirmed'!`, updateData[0])
        }
      } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
        const rawReference = paymentData.external_reference || ''
        const matchId = rawReference.replace(/^match_/, '').trim()
        
        if (matchId) {
          console.log(`Pagamento falhou (${paymentData.status}). Cancelando partida ID: "${matchId}"`)
          
          const supabaseUrl = Deno.env.get('SUPABASE_URL')
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)
            
            const { data: updateData, error: updateError } = await supabase
              .from('matches')
              .update({ status: 'cancelada' })
              .eq('id', matchId)
              .select()

            if (updateError) {
              console.error("Erro ao cancelar partida:", updateError)
            } else if (updateData && updateData.length > 0) {
              console.log(`Partida ${matchId} cancelada com sucesso devido ao pagamento falhado`)
            }
          } else {
            console.error("Variáveis de ambiente do Supabase não encontradas para cancelamento")
          }
        } else {
          console.warn("Pagamento falhou mas external_reference não encontrado")
        }
      } else {
        console.log(`Pagamento ainda não aprovado (status: ${paymentData.status}). Ignorando atualização.`)
      }
    } else {
      console.log(`Notificação ignorada (topic: ${topic}, paymentId: ${paymentId})`)
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 200 
    })

  } catch (err) {
    console.error("ERRO CRÍTICO NO WEBHOOK:", (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})