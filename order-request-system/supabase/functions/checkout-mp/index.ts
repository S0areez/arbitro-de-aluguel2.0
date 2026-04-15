// cspell:ignore reserva, arbitro, aluguel, init, unit, unit_price
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface CheckoutRequestBody {
  amount: number | string;
  reservaId: string | number;
}

interface MercadoPagoPreference {
  init_point: string;
  message?: string;
  [key: string]: unknown;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { amount, reservaId }: CheckoutRequestBody = await req.json();

    // Validação rigorosa
    if (!amount || isNaN(Number(amount))) {
      throw new Error("Valor (amount) inválido.");
    }
    if (!reservaId) {
      throw new Error("ID da reserva é obrigatório.");
    }

    // NUNCA deixe tokens expostos no código. 
    // Configure isso no dashboard do Supabase em Edge Functions > Secrets
    const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN"); 

    if (!MP_TOKEN) {
      throw new Error("Configuração do servidor pendente (Token MP).");
    }
    const token = "APP_USR-1285414236511355-031209-aa88a89e5d6b43b106cf09aeed981b97-3260578791";
 parent of c2702d6 (Exclusao de GPS/Alteracao de valor fixo)

    const mpBody = {
      items: [
        {
          id: String(reservaId),
          title: "Reserva - Árbitro de Aluguel",
          quantity: 1,
          unit_price: Number(Number(amount).toFixed(2)),
          currency_id: "BRL",
        }
      ],
      payer: {
        email: "comprador@exemplo.com" // Em produção, receba o e-mail do usuário logado
      },
      back_urls: {
        // Altere para a URL da Vercel em produção
        success: "https://arbitro-de-aluguel2-0.vercel.app/carteira",
        failure: "https://arbitro-de-aluguel2-0.vercel.app/carteira",
        pending: "https://arbitro-de-aluguel2-0.vercel.app/carteira"
      },
      auto_return: "approved",
        // Tente usar uma URL que o MP aceite melhor, 
        // ou coloque a URL final do seu projeto se já tiver feito deploy (Vercel/Netlify)
        success: "http://localhost:8080/carteira",
        failure: "http://localhost:8080/carteira",
        pending: "http://localhost:8080/carteira"
      },
      // DESATIVE ESTA LINHA ABAIXO para parar o erro 400
      // auto_return: "approved", 
 parent of c2702d6 (Exclusao de GPS/Alteracao de valor fixo)
      external_reference: String(reservaId),
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mpBody),
    });

    const data: MercadoPagoPreference = await response.json();

    if (!response.ok) {
      console.error("Erro MP API:", data);
      throw new Error(data.message || "Falha na comunicação com Mercado Pago");
    }

    return new Response(
      JSON.stringify({ checkoutUrl: data.init_point }),
      { 
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error("EDGE FUNCTION ERROR:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, 
        status: 400 
      }
    );
  }
});