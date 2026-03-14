ntrodução
A DePix Invoice API permite que você crie cobranças PIX automaticamente convertidas em criptomoeda DePix. Seus clientes pagam via PIX e você recebe DePix instantaneamente na sua carteira.

Base URL: https://pixwave.cash/invoice/api/v1

🔐 Autenticação
Todas as requisições devem incluir o header Authorization com sua API Key.

Formato do Header:
Authorization: Bearer {sua_api_key}
⚠️ Importante: Você pode criar e gerenciar suas API Keys no painel administrativo em Configurações → API Keys. Cada usuário pode ter até 10 API Keys ativas.

Exemplo (JavaScript):
const apiKey = "dpx_live_1234567890abcdef"; fetch("https://pixwave.cash/invoice/api/v1/create", { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ description: "Plano Premium", price: 49.90, externalId: "order_12345", redirectTo: "https://meusite.com/sucesso", webhooks: [ { hookType: "PAYMENT_CONFIRMED", url: "https://meusite.com/webhook" } ] }) });
Exemplo (Python):
import requests api_key = "dpx_live_1234567890abcdef" response = requests.post( "https://pixwave.cash/invoice/api/v1/create", headers={ "Authorization": f"Bearer {api_key}", "Content-Type": "application/json" }, json={ "description": "Plano Premium", "price": 49.90, "externalId": "order_12345", "redirectTo": "https://meusite.com/sucesso", "webhooks": [ { "hookType": "PAYMENT_CONFIRMED", "url": "https://meusite.com/webhook" } ] } ) print(response.json())
Exemplo (cURL):
curl -X POST https://pixwave.cash/invoice/api/v1/create \ -H "Authorization: Bearer dpx_live_1234567890abcdef" \ -H "Content-Type: application/json" \ -d '{ "description": "Plano Premium", "price": 49.90, "externalId": "order_12345", "redirectTo": "https://meusite.com/sucesso", "webhooks": [ { "hookType": "PAYMENT_CONFIRMED", "url": "https://meusite.com/webhook" } ] }'
📡 Endpoints
POST
/create
Cria um novo invoice e gera QR Code PIX automaticamente.

Request Body:
{ "description": "Plano Premium - Mensal", "invoiceType": "SINGLE", "price": 49.90, "externalId": "order_12345", "paymentTypes": ["PIX"], "redirectTo": "https://meusite.com/sucesso", "webhooks": [ { "hookType": "PAYMENT_CONFIRMED", "url": "https://meusite.com/webhook" }, { "hookType": "INVOICE_CREATED", "url": "https://meusite.com/webhook" }, { "hookType": "PAYMENT_CANCELLED", "url": "https://meusite.com/webhook" }, { "hookType": "INVOICE_EXPIRED", "url": "https://meusite.com/webhook" } ] }
⚠️ Importante: O campo dueDate foi removido. Os invoices expiram automaticamente quando o QR Code PIX expira (gerenciado pela API Eulen). O tempo de expiração é retornado no campo payment.expiresAt.

Response (200 OK):
{ "id": "123e4567-e89b-12d3-a456-426614174000", "status": "pending", "amount": 49.90, "description": "Plano Premium - Mensal", "externalId": "order_12345", "payment": { "method": "PIX", "qrCode": "00020126580014br.gov.bcb.pix...", "qrCodeImageUrl": "https://api.qrserver.com/...", "paymentUrl": "https://depix.com/invoice/pay/123e4567...", "expiresAt": "2024-12-31T23:59:59Z" }, "redirectTo": "https://meusite.com/sucesso", "createdAt": "2024-01-15T10:30:00Z" }
GET
/{invoice_id}
Consulta detalhes de um invoice pelo UUID.

Response (200 OK):
{ "id": "123e4567-e89b-12d3-a456-426614174000", "status": "paid", "amount": 49.90, "description": "Plano Premium - Mensal", "externalId": "order_12345", "invoiceType": "SINGLE", "paymentTypes": ["PIX"], "redirectTo": "https://meusite.com/sucesso", "createdAt": "2024-01-15T10:30:00Z", "updatedAt": "2024-01-15T10:35:00Z", "paidAt": "2024-01-15T10:35:00Z", "payment": { "method": "PIX", "qrCode": "00020126...", "paymentUrl": "https://depix.com/invoice/pay/123e4567...", "status": "paid", "depositId": "dep_xxxxx", "payerName": "João Silva", "payerDocument": "12345678900", "blockchainTxId": "0xabcd..." } }
GET
/
Lista invoices com filtros e paginação.

Query Parameters:
status (opcional): pending, paid, expired, cancelled
limit (opcional): Máximo de resultados (padrão: 50)
offset (opcional): Paginação (padrão: 0)
Response (200 OK):
{ "total": 125, "limit": 50, "offset": 0, "items": [ { "id": "123e4567-e89b-12d3-a456-426614174000", "status": "paid", "amount": 49.90, "description": "Plano Premium", "externalId": "order_12345", "createdAt": "2024-01-15T10:30:00Z", "paidAt": "2024-01-15T10:35:00Z" } ] }
🔔 Webhooks
Configure webhooks para receber notificações de eventos em tempo real. Seu servidor receberá um POST com o payload no formato JSON.

Tipos de Eventos:
INVOICE_CREATED
Invoice criado com sucesso e QR Code gerado

PAYMENT_CONFIRMED
Pagamento PIX confirmado e convertido em DePix

PAYMENT_CANCELLED
Pagamento cancelado pelo sistema

INVOICE_EXPIRED
Invoice expirado (QR Code não pago a tempo)

📄 1. INVOICE_CREATED
Enviado imediatamente após a criação do invoice e geração do QR Code PIX.

{ "event": "INVOICE_CREATED", "timestamp": "2024-01-15T10:30:00-03:00", "invoice": { "id": "123e4567-e89b-12d3-a456-426614174000", "externalId": "order_12345", "status": "pending", "amount": 49.90, "description": "Plano Premium - Mensal", "createdAt": "2024-01-15T10:30:00-03:00" }, "payment": { "method": "PIX", "qrCode": "00020126580014br.gov.bcb.pix...", "qrCodeImageUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...", "paymentUrl": "https://depix.viralmedia.vip/invoice/pay/123e4567...", "expiresAt": "2024-01-15T11:30:00-03:00" } }
✅ 2. PAYMENT_CONFIRMED
Enviado quando o pagamento PIX é confirmado e o DePix é creditado na carteira.

{ "event": "PAYMENT_CONFIRMED", "timestamp": "2024-01-15T10:35:00-03:00", "invoice": { "id": "123e4567-e89b-12d3-a456-426614174000", "externalId": "order_12345", "status": "paid", "amount": 49.90, "description": "Plano Premium - Mensal", "createdAt": "2024-01-15T10:30:00-03:00", "paidAt": "2024-01-15T10:35:00-03:00" }, "payment": { "method": "PIX", "status": "paid", "depositId": "dep_abc123xyz", "payerName": "João Silva", "payerDocument": "12345678900", "blockchainTxId": "0xabcdef1234567890...", "paymentUrl": "https://depix.viralmedia.vip/invoice/pay/123e4567..." } }
❌ 3. PAYMENT_CANCELLED
Enviado quando um pagamento é cancelado pelo sistema (ex: depósito inválido).

{ "event": "PAYMENT_CANCELLED", "timestamp": "2024-01-15T10:40:00-03:00", "invoice": { "id": "123e4567-e89b-12d3-a456-426614174000", "externalId": "order_12345", "status": "cancelled", "amount": 49.90, "description": "Plano Premium - Mensal", "createdAt": "2024-01-15T10:30:00-03:00", "cancelledAt": "2024-01-15T10:40:00-03:00" }, "payment": { "method": "PIX", "status": "cancelled", "depositId": "dep_abc123xyz", "paymentUrl": "https://depix.viralmedia.vip/invoice/pay/123e4567..." } }
⏰ 4. INVOICE_EXPIRED
Enviado quando o invoice expira (QR Code PIX venceu sem pagamento).

{ "event": "INVOICE_EXPIRED", "timestamp": "2024-01-15T11:30:00-03:00", "invoice": { "id": "123e4567-e89b-12d3-a456-426614174000", "externalId": "order_12345", "status": "expired", "amount": 49.90, "description": "Plano Premium - Mensal", "createdAt": "2024-01-15T10:30:00-03:00", "expiredAt": "2024-01-15T11:30:00-03:00" }, "payment": { "method": "PIX", "status": "expired", "paymentUrl": "https://depix.viralmedia.vip/invoice/pay/123e4567..." } }
🔄 Retry Automático
Se o webhook falhar (timeout, erro 5xx, etc), o sistema tentará reenviar automaticamente:

Máximo: 3 tentativas
Timeout: 10 segundos por tentativa
Status esperado: 200-299 (sucesso)
Logs: Todas as tentativas são registradas com request/response
💳 Página de Pagamento
Quando você cria um invoice, recebe uma URL de pagamento (payment.paymentUrl). Envie esta URL para seu cliente realizar o pagamento PIX.

O que o cliente vê:
QR Code PIX para escanear com o app do banco
Código PIX Copia e Cola para copiar manualmente
Valor e descrição do pagamento
Timer de expiração mostrando tempo restante
Botão de ação (se redirectTo foi configurado)
🔗 Parâmetro redirectTo
Configure uma URL para onde o cliente deve ir após interagir com a página de pagamento. O sistema adiciona automaticamente query params com informações do invoice:

Query Params adicionados:
# URL configurada: "redirectTo": "https://meusite.com/sucesso" # URL gerada (antes do pagamento): https://meusite.com/sucesso?invoice_id=123e4567&status=pending&external_id=order_12345 # URL gerada (depois do pagamento): https://meusite.com/sucesso?invoice_id=123e4567&status=paid&external_id=order_12345&paid_at=2024-01-15T10:35:00Z
🎯 Comportamento do Botão:
Antes do Pagamento
Botão: "Voltar ao Site"

Redireciona para redirectTo com status=pending

Depois do Pagamento
Botão: "Continuar"

Redireciona para redirectTo com status=paid + paid_at

💡 Dica: Use os query params para identificar o invoice e atualizar seu sistema. Por exemplo, se status=paid, você pode liberar o acesso ao conteúdo premium do cliente.