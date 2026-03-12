# Revisão Pós-Remoção Z-API

**Data:** Março 2025  
**Objetivo:** Verificar conflitos, rotas quebradas e problemas após a remoção completa da integração Z-API/WhatsApp.

## Resumo Executivo

A revisão identificou e corrigiu pontos residuais e inconsistências. Nenhum conflito crítico ou rota quebrada foi encontrado. O sistema opera corretamente via **App Impetus** como canal unificado.

---

## Verificações Realizadas

### 1. Rotas e Webhooks
- **POST /api/webhook** — Webhook genérico ativo (grava em `messages`, processa via `ai.processIncomingMessage`).
- **POST /api/webhook/zapi** — Removido corretamente; não há referências ativas no código.
- **POST /api/app-impetus/messages** — Canal principal para entrada de mensagens.
- **GET /api/app-impetus/outbox** — Busca de mensagens pendentes pelo App.

### 2. Imports e Dependências
- Nenhum `require()` para módulos removidos (`zapi`, `zapiService`, `whatsappService`, etc.).
- Backend e frontend não importam código Z-API.

### 3. Endpoints Admin Settings
- Rotas Z-API (`/admin/settings/zapi`, `/admin/settings/zapi/test`) removidas.
- Frontend não chama mais esses endpoints.
- `adminSettings` em `api.js` não expõe métodos Z-API.

### 4. Serviços de Mensageria
- `subscriptionNotifications` — Usa `appImpetusService.sendMessage` ✅
- `tpmNotifications` — Usa `appImpetusService.sendMessage` ✅
- `organizationalAI` — Usa `appImpetusService.sendMessage` ✅
- `aiProactiveMessagingService` — Usa `appImpetusService.sendMessage` ✅
- `executiveMode` — Usa `appImpetusService` para respostas ✅

### 5. Banco de Dados
- Tabelas `zapi_configurations` e `zapi_sent_messages` — Mantidas por histórico; nenhum código novo grava nelas.
- Coluna `ai_outbound_audit.zapi_message_id` — Continua armazenando o ID da mensagem (App Impetus); nome legado, sem impacto funcional.
- Migrações antigas Z-API — Mantidas em `run-all-migrations.js` para compatibilidade com instalações que já as executaram.

---

## Correções Aplicadas

### Backend

1. **`backend/src/routes/admin/settings.js`**
   - Removidos `encrypt` e `maybeEncryptToken` (código morto, usados apenas para tokens Z-API).
   - Atualizado cabeçalho do arquivo.

2. **`backend/src/services/tpmNotifications.js`**
   - Fallback para `config.whatsapp_contacts` quando a tabela `whatsapp_contacts` está vazia ou não existe.
   - Garante que contatos configurados em Admin Settings sejam usados nas notificações TPM.

3. **`backend/src/models/complete_schema.sql`**
   - Comentário de `whatsapp_number` atualizado de "integração Z-API" para "App Impetus, Modo Executivo".

---

## Pontos de Atenção

### Documentação
Os arquivos em `docs/` (ex.: `ARQUITETURA_MENSAGENS.md`, `IMPETUS_ZAPI_ARQUITETURA.md`) ainda descrevem o fluxo Z-API por fins históricos. Podem ser movidos para `docs/arquivo/` ou marcados como obsoletos se desejado.

### Contatos WhatsApp
- **Admin Settings** armazena contatos em `companies.config.whatsapp_contacts` (JSONB).
- **TPM Notifications** usa: (1) usuários com telefone, (2) tabela `whatsapp_contacts`, (3) `config.whatsapp_contacts` como fallback.

---

## Conclusão

O projeto está consistente após a remoção do Z-API. Todas as funções de mensagem passam pelo App Impetus, e o Modo Executivo segue funcionando via Chat web e App Impetus.
