# Plano: Integração Z-API Extremamente Eficaz para Rastreamento Total

**Objetivo:** IA com acesso à toda comunicação, capaz de enviar mensagens proativas via WhatsApp com rastreabilidade, segurança e conformidade LGPD.

---

## 1. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE CAPTURA                                    │
│  Z-API Webhook → processWebhook → communications (inbound) + resolver         │
│  Respostas automáticas → logOutbound → communications (outbound)              │
│  sendTextMessage / sendAutoReply → zapi_sent_messages + communications       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE CONTEXTO PARA IA                                 │
│  communicationContextService → getRelevantCommunications                      │
│  chatUserContext → buildChatUserContext (injeta comunicações no prompt)      │
│  communicationContextForAI (novo) → contexto completo por usuário/empresa     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CAMADA DE IA PROATIVA                                       │
│  aiProactiveMessagingService → decide quando enviar (lembrete, alerta, etc)   │
│  Verificação: LGPD consent, rate limit, whitelist, audit                      │
│  Envio: zapi.sendTextMessage → ai_outbound_audit (rastreabilidade)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Princípios de Implementação

| Princípio | Implementação |
|-----------|---------------|
| **Rastreabilidade total** | Toda mensagem (entrada/saída) em `communications`; auditoria em `ai_outbound_audit` |
| **Dados precisos** | Resolver sender→user; `sender_name` preenchido; `conversation_thread_id` para threads |
| **Segurança** | Whitelist opcional; rate limit; consentimento LGPD para proativas |
| **LGPD** | Aviso primeiro contato; `data_access_logs`; anonimização; retenção configurável |
| **Escalabilidade** | Índices otimizados; escopo hierárquico; cache de contexto quando necessário |

---

## 3. Componentes e Melhorias

### 3.1 Captura e armazenamento (já implementado / ajustes)

- [x] Webhook recebe mensagens
- [x] `zapiCommunicationResolver` vincula sender a user, extrai nome
- [x] Aviso LGPD primeiro contato
- [x] Whitelist opcional (`WHITELIST_STRICT`)
- [x] `logOutboundCommunication` para respostas automáticas
- [x] Corrigir bug `conversation_thread_id` (WHERE id = $1 → $2)
- [x] `sendTextMessage` aceita opts para registrar em communications (relatedCommunicationId, conversationThreadId)
- [x] Todas as saídas proativas passam por `aiProactiveMessagingService` → `logOutboundCommunication` + `ai_outbound_audit`

### 3.2 Contexto unificado para a IA

- [x] `communicationContextService` agrega inbound+outbound
- [x] `chatUserContext` injeta no prompt do chat
- [x] `getFullCommunicationContextForAI(companyId, user)` – contexto completo respeitando hierarquia
- [x] `getCommunicationsForContact(companyId, senderPhone)` – histórico por contato para IA proativa

### 3.3 IA proativa – critérios de envio

| Gatilho | Condição | Ação exemplo | Base legal |
|---------|----------|--------------|------------|
| Tarefa atrasada | `due_date < now()` e status open | Lembrete via WhatsApp | Legítimo interesse |
| Padrão de falha | 3+ falhas similares em 24h | Alerta para gestores | Legítimo interesse |
| Evento incompleto | Cobrança após 1h | Próxima pergunta | Execução de contrato |
| Sugestão de manutenção | PLC/kpi fora da faixa | Sugestão preventiva | Legítimo interesse |
| Assinatura vence | X dias antes | Aviso financeiro | Execução de contrato |

### 3.4 Serviço de mensagens proativas (aiProactiveMessagingService)

- [x] Verificar `ai_proactive_consent` (LGPD) quando `AI_PROACTIVE_CONSENT_REQUIRED=true`
- [x] Rate limit por telefone/empresa (`AI_PROACTIVE_MAX_PER_USER_PER_DAY`)
- [x] Registrar em `ai_outbound_audit` antes de enviar
- [x] Horário comercial configurável (`AI_PROACTIVE_BUSINESS_HOURS_ONLY`, 8h-18h seg-sex)
- [x] Rotas `GET/POST /api/lgpd/proactive-consent` para opt-in/opt-out

### 3.5 Auditoria e LGPD

- Tabela `ai_outbound_audit`: motivo, destinatário, texto (resumo), timestamp, resultado
- `data_access_logs` para exportação e anonimização
- Política de retenção documentada
- Consentimento explícito para mensagens proativas (opt-in)

---

## 4. Fluxo de Dados

### Entrada (WhatsApp → Impetus)
1. Z-API envia POST ao webhook
2. Resolver identifica usuário e extrai nome
3. Opcional: whitelist; aviso LGPD primeiro contato
4. INSERT em `communications` (direction=inbound)
5. Processamento: CEO → TPM → OrgAI → IA padrão
6. Resposta automática → `sendAutoReply` → `logOutboundCommunication` → `communications` (direction=outbound)

### Saída proativa (Impetus → WhatsApp)
1. Job/cron ou evento interno chama `aiProactiveMessagingService.shouldSend(userId, triggerType)`
2. Verifica consentimento, rate limit, horário
3. Gera mensagem (template ou IA)
4. INSERT em `ai_outbound_audit` (antes)
5. `zapi.sendTextMessage` + `logOutboundCommunication`
6. UPDATE `ai_outbound_audit` (resultado)

### Contexto para IA
1. Chat ou job proativo chama `communicationContextService.getRelevantCommunications`
2. Filtro hierárquico aplicado
3. Retorno: lista inbound+outbound ordenada por data
4. Injetado no prompt ou usado para decisão

---

## 5. Tabelas e Schema

```sql
-- ai_outbound_audit: rastreabilidade de mensagens enviadas pela IA
CREATE TABLE ai_outbound_audit (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  recipient_user_id UUID,
  recipient_phone TEXT NOT NULL,
  trigger_type TEXT,  -- 'reminder', 'alert', 'suggestion', 'failure_pattern', etc
  message_preview TEXT,
  sent_at TIMESTAMPTZ,
  zapi_message_id TEXT,
  success BOOLEAN,
  error_message TEXT,
  lgpd_consent_verified BOOLEAN,
  created_at TIMESTAMPTZ
);

-- ai_proactive_consent: opt-in para mensagens proativas
CREATE TABLE ai_proactive_consent (
  user_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
```

---

## 6. Variáveis de Ambiente

```env
WHITELIST_STRICT=false          # true = só usuários/contatos cadastrados
WHATSAPP_LGPD_NOTICE_ENABLED=true
WHATSAPP_LGPD_FIRST_CONTACT_MSG=...  # Mensagem customizável
AI_PROACTIVE_CONSENT_REQUIRED=true   # Exigir opt-in para proativas
AI_PROACTIVE_BUSINESS_HOURS_ONLY=true # Só enviar em horário comercial
AI_PROACTIVE_MAX_PER_USER_PER_DAY=5  # Rate limit
```

---

## 7. Checklist de Implementação

1. [x] Migration: `ai_outbound_audit`, `ai_proactive_consent` (ai_outbound_audit_migration.sql)
2. [x] Corrigir bug `conversation_thread_id` em zapi.js
3. [x] Atualizar `sendTextMessage` para aceitar opts e chamar `logOutboundCommunication`
4. [x] Criar `aiProactiveMessagingService`
5. [x] Integrar auditoria em `proactiveAI.js` (usa sendProactiveMessage)
6. [x] Rotas `GET/POST /api/lgpd/proactive-consent` para opt-in/opt-out
7. [x] Expandir `communicationContextService` (getCommunicationsForContact, getFullCommunicationContextForAI)
8. [ ] Documentar política de retenção e fluxo LGPD (recomendado)

---

*Plano alinhado a práticas de engenharia de software sênior: rastreabilidade, auditoria, LGPD e arquitetura escalável.*
