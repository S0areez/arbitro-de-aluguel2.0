# Mercado Pago Webhook

Esta função Edge do Supabase processa webhooks do Mercado Pago para atualizar o status dos pagamentos das partidas.

## Configuração

### Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis de ambiente no painel do Supabase:

- `MP_WEBHOOK_SECRET`: Secret do webhook do Mercado Pago (disponível no painel do Mercado Pago)
- `MP_ACCESS_TOKEN`: Access Token do Mercado Pago (disponível no painel do Mercado Pago)

### Configuração no Mercado Pago

1. Acesse o painel do Mercado Pago
2. Vá para "Notificações" ou "Webhooks"
3. Configure a URL do webhook: `https://your-project.supabase.co/functions/v1/mp-webhook`
4. Selecione os eventos de pagamento para notificar

## Funcionamento

A função:

1. **Valida a assinatura** do webhook (opcional em desenvolvimento)
2. **Busca detalhes** do pagamento na API do Mercado Pago
3. **Atualiza o status** da partida no banco de dados:
   - `approved` → `confirmed`
   - `rejected` ou `cancelled` → `cancelada`
4. **Evita processamento duplicado** verificando se a partida já foi processada

## Status Flow

- `waiting_payment` → `confirmed` (pagamento aprovado)
- `waiting_payment` → `cancelada` (pagamento rejeitado/cancelado)

## Logs

A função gera logs detalhados no console do Supabase para debugging.