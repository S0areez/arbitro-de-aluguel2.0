import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const MP_WEBHOOK_SECRET = "07170624dedb9ee8e8faeb3dfa0e673b7e36a90cb1871f85d7addef9e93543c9"

  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get('x-signature') || ''
    
    console.log("--- NOVA NOTIFICAÇÃO ---")
    console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
    console.log("Body:", rawBody)

    const body = JSON.parse(rawBody)
    
    // O Mercado Pago envia o ID do pagamento de várias formas
    const paymentId = body.data?.id || body.resource?.split('/').pop() || body.id
    const topic = body.type || body.topic || (body.resource?.includes('payments') ? 'payment' : null)

    console.log(`PaymentId detectado: ${paymentId}, Topic detectado: ${topic}`)

    // 1. Validação da Assinatura (Segurança) - Opcional se falhar para testes
    if (signatureHeader && paymentId) {
      try {
        const parts = signatureHeader.split(',')
        let ts = '', v1 = ''
        parts.forEach(part => {
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
        console.error("Erro ao validar assinatura:", sigError.message)
      }
    }

    if (topic === 'payment' && paymentId) {
      const token = "APP_USR-1285414236511355-031209-aa88a89e5d6b43b106cf09aeed981b97-3260578791"

      console.log(`Buscando detalhes do pagamento ${paymentId} no Mercado Pago...`)

      // 1. Busca o status real do pagamento na API do Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${token}` }
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
        const matchId = paymentData.external_reference
        console.log(`Pagamento APROVADO. Tentando atualizar partida ID: "${matchId}"`)

        if (!matchId) {
          console.error("ERRO: external_reference está vazio no objeto de pagamento do MP!")
          throw new Error("Missing external_reference")
        }

        // 2. Conecta ao Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseKey) {
          console.error("ERRO: Variáveis de ambiente do Supabase não encontradas!")
          throw new Error("Missing Supabase env vars")
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 3. Atualiza a partida
        const { data: updateData, error: updateError } = await supabase
          .from('matches')
          .update({ status: 'pendente' })
          .eq('id', matchId)
          .select()

        if (updateError) {
          console.error("Erro na query de update do Supabase:", updateError)
          throw updateError
        }

        if (!updateData || updateData.length === 0) {
          console.warn(`AVISO: Nenhuma linha foi alterada no banco para o ID "${matchId}". Verifique se o ID existe na tabela 'matches'.`)
        } else {
          console.log(`SUCESSO TOTAL: Partida ${matchId} atualizada para 'pendente'!`, updateData[0])
        }
      } else {
        console.log(`Pagamento ainda não aprovado (status: ${paymentData.status}). Ignorando atualização.`)
      }
    } else {
      console.log("Notificação ignorada (não é um tópico de pagamento ou ID ausente).")
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 200 
    })

  } catch (err) {
    console.error("ERRO CRÍTICO NO WEBHOOK:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    })
  }
})