# Plano de Unificação: Impetus Comunica IA + App Impetus

**Versão:** 1.0  
**Data:** 2026-03-07  
**Objetivo:** Unificar Impetus Comunica IA e App Impetus em um único produto, substituindo Z-API/WhatsApp pelo App Impetus como canal de comunicação.

---

## 1. VISÃO GERAL

### 1.1 Estado Atual
- **Impetus Comunica IA:** Plataforma web com backend Node.js + frontend React. Comunicação via Z-API (WhatsApp).
- **App Impetus:** Produto separado (código sob responsabilidade da equipe Gustavo). Será integrado como canal de comunicação.

### 1.2 Estado Alvo
- **Produto único:** Mesmo backend, mesmo frontend, mesma hospedagem e deploy.
- **Canal de comunicação:** App Impetus substitui Z-API completamente.
- **Funcionalidades preservadas:** Modo Executivo, TPM, IA Organizacional, classificação, tarefas, diagnósticos — apenas o canal muda.

---

## 2. ARQUITETURA DA INTEGRAÇÃO

### 2.1 Fluxo de Mensagens (Entrada)
```
ANTES: WhatsApp → Z-API → POST /api/webhook/zapi → processWebhook → communications
DEPOIS: App Impetus → POST /api/app-impetus/messages → processIncomingFromApp → communications
```

### 2.2 Fluxo de Mensagens (Saída)
```
ANTES: sendTextMessage → Z-API API → WhatsApp
DEPOIS: sendMessage → app_impetus_outbox → App Impetus (poll GET /api/app-impetus/outbox)
```

### 2.3 Contrato de API (App Impetus ↔ Backend)

**Entrada (App envia mensagem do usuário):**
```
POST /api/app-impetus/messages
Authorization: Bearer <token> (ou API key por empresa)
Body: {
  company_id: string (UUID),
  sender_user_id?: string (UUID - usuário logado no app),
  sender_phone?: string (fallback se não tiver user_id),
  text: string,
  message_type?: 'text' | 'image' | 'document' | 'audio',
  media_url?: string,
  metadata?: object
}
```

**Saída (App busca mensagens pendentes para o usuário):**
```
GET /api/app-impetus/outbox
Authorization: Bearer <token>
Query: ?since=<timestamp>
Response: {
  messages: [{
    id, company_id, recipient_phone, text_content, created_at,
    originated_from: 'executive'|'tpm'|'org_ai'|'task'|'diagnostic'|'subscription'|'proactive'
  }]
}
```
O App identifica o usuário pelo token e retorna mensagens onde `recipient_phone` = phone do usuário autenticado.

---

## 3. ARQUIVOS E MUDANÇAS

### 3.1 CRIAR (novos)
| Arquivo | Descrição |
|---------|-----------|
| `backend/src/services/appImpetusService.js` | Serviço unificado: sendMessage (enfileira), processIncomingFromApp (processa entrada) |
| `backend/src/routes/app_impetus.js` | Rotas: POST /messages, GET /outbox |
| `backend/src/models/app_impetus_outbox_migration.sql` | Tabela app_impetus_outbox |

### 3.2 MODIFICAR (substituir Z-API por App Impetus)
| Arquivo | Mudança |
|---------|---------|
| `backend/src/services/executiveMode.js` | zapi.sendTextMessage → appImpetusService.sendMessage |
| `backend/src/services/tpmNotifications.js` | idem |
| `backend/src/services/organizationalAI.js` | idem |
| `backend/src/services/subscriptionNotifications.js` | idem |
| `backend/src/services/aiProactiveMessagingService.js` | idem |
| `backend/src/services/tpmConversation.js` | sendAutoReply → appImpetusService.sendMessage |
| `backend/src/services/zapi.js` | processWebhook: lógica movida para appImpetusService.processIncomingFromApp; sendAutoReply → appImpetusService |
| `backend/src/jobs/proactiveAI.js` | zapi.sendTextMessage → appImpetusService.sendMessage |
| `backend/src/app.js` | Remover rotas Z-API; adicionar rotas app-impetus |
| `frontend/src/pages/AdminSettings.jsx` | Tab Z-API → Tab "Comunicação" (App Impetus integrado, sem config) |
| `frontend/src/services/api.js` | Remover zapi, whatsapp; adicionar appImpetus se necessário |

### 3.3 REMOVER (Z-API)
| Arquivo | Ação |
|---------|------|
| `backend/src/routes/zapi_webhook.js` | Remover (substituído por app_impetus) |
| `backend/src/routes/zapi.js` | Remover |
| `backend/src/routes/whatsapp.js` | Remover |
| `backend/src/services/zapiService.js` | Remover |
| `backend/src/services/zapiRateLimit.js` | Remover (rate limit pode ser no appImpetusService se necessário) |
| `backend/src/services/whatsappService.js` | Remover |

### 3.4 MANTER (não alterar)
- `backend/src/services/zapi.js` → Será **refatorado** para delegar a appImpetusService (ou removido e lógica migrada)
- Tabelas `zapi_configurations`, `zapi_sent_messages` → Podem permanecer para histórico; novas mensagens usam app_impetus_outbox
- `companyIntegration.js` → Ajustar para não depender de instance_id Z-API
- Toda lógica de negócio: executiveMode, tpmConversation, organizationalAI, ai, incomingMessageProcessor

---

## 4. ESTRATÉGIA DE SEGURANÇA

1. **Feature flag (opcional):** `COMMUNICATION_CHANNEL=app_impetus` para rollback.
2. **Migração incremental:** Criar appImpetusService primeiro; serviços passam a usar; depois remover Z-API.
3. **Preservar dados:** Não dropar tabelas zapi_*; apenas parar de escrever.
4. **Testes:** Validar cada serviço após substituição.

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] 1. Migration app_impetus_outbox
- [ ] 2. appImpetusService.js (sendMessage + processIncomingFromApp)
- [ ] 3. Rotas app_impetus.js
- [ ] 4. Substituir chamadas zapi em: executiveMode, tpmNotifications, organizationalAI, subscriptionNotifications, aiProactiveMessagingService, proactiveAI, tpmConversation
- [ ] 5. Refatorar zapi.js: processWebhook → chamar appImpetusService.processIncomingFromApp (ou migrar lógica)
- [ ] 6. app.js: trocar rotas
- [ ] 7. AdminSettings: tab Z-API → Comunicação (App Impetus)
- [ ] 8. Remover: zapi_webhook, zapi, whatsapp routes; zapiService, zapiRateLimit, whatsappService
- [ ] 9. admin/settings.js: remover endpoints Z-API
- [ ] 10. api.js frontend: remover zapi, whatsapp; ajustar adminSettings

---

## 6. OBSERVAÇÕES PARA A EQUIPE GUSTAVO

- O App Impetus deve implementar:
  1. **Envio:** Quando usuário envia mensagem no app → POST /api/app-impetus/messages
  2. **Recebimento:** Polling ou WebSocket em GET /api/app-impetus/outbox para buscar mensagens pendentes
- O backend retorna mensagens onde `recipient_phone` corresponde ao telefone do usuário autenticado.
- Merge do código: O App Impetus (frontend mobile/web) deve ser integrado ao repositório unificado na branch main.
