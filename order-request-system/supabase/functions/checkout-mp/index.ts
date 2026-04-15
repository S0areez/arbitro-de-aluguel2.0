// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { amount, reservaId } = await req.json();
    
    // Validando dados de entrada
    if (!amount || isNaN(Number(amount))) {
      throw new Error("O valor (amount) é inválido ou está faltando.");
    }

    const token = "APP_USR-1285414236511355-031209-aa88a89e5d6b43b106cf09aeed981b97-3260578791";

    const mpBody = {
      items: [
        {
          id: String(reservaId),
          title: "Reserva de Arbitro - Arbitro de Aluguel",
          quantity: 1,
          unit_price: Number(Number(amount).toFixed(2)),
          currency_id: "BRL",
        }
      ],
      payer: {
        email: "test_user_123@testuser.com" 
      },
      back_urls: {
        // Tente usar uma URL que o MP aceite melhor, 
        // ou coloque a URL final do seu projeto se já tiver feito deploy (Vercel/Netlify)
        success: "http://localhost:8080/carteira",
        failure: "http://localhost:8080/carteira",
        pending: "http://localhost:8080/carteira"
      },
      // DESATIVE ESTA LINHA ABAIXO para parar o erro 400
      // auto_return: "approved", 
      external_reference: String(reservaId),
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mpBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ERRO DETALHADO DO MP:", data);
      return new Response(
        JSON.stringify({ 
          error: data.message || "Erro na API do Mercado Pago",
          details: data 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ checkoutUrl: data.init_point }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("ERRO NA FUNCTION:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
})