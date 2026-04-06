# Integrações — segurança e operação

## MES/ERP (`POST /api/integrations/mes-erp/push`)

- Cada push exige `company_id`, `connector_id` e token (`X-Integration-Token` ou `body.token`) igual ao configurado no conector.
- Conectores criados pela API recebem `webhook_secret` em `auth_config` automaticamente.
- **Conectores antigos** sem `webhook_secret` nem `api_key`: executar `backend/src/models/integration_connectors_webhook_secret_backfill.sql` na base de dados, depois configurar o token no sistema MES.

## Webhook de mensagens (`POST /api/webhook`)

- **Segredo partilhado:** `INCOMING_WEBHOOK_SECRET` — enviar em `X-Webhook-Secret` ou `Authorization: Bearer`.
- **Meta / WhatsApp Cloud (opcional):** definir `META_APP_SECRET` ou `WHATSAPP_APP_SECRET` ou `FACEBOOK_APP_SECRET` (App Secret do Meta). Pedidos com `X-Hub-Signature-256` são validados com HMAC-SHA256 sobre o corpo bruto; o servidor preserva raw body só nesta rota.
- **Produção:** guardar segredos em gestão centralizada (Vault, Secrets Manager, variáveis encriptadas no host), não partilhar `.env` em repositórios ou servidores multi-inquilino sem controlo.

## Edge (`POST /api/integrations/edge/ingest`)

- Exige agente registado em `edge_agents` com `token_hash` e token válido no payload. Sem tabela ou sem registo, o pedido é rejeitado (paridade com MES).

## Observabilidade

- Falhas de autenticação em webhook e MES são registadas em consola com prefixos `[WEBHOOK_AUTH]` e `[MES_ERP_AUTH]` (sem corpo de pedido).
