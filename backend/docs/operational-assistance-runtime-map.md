# IMPETUS — Mapa Operacional do Runtime de Assistência
## Operational Assistance Runtime Map

**Data:** 2026-05-13  
**Referência:** Investigação Arquitetural Profunda — Operational Memory & Task Orchestration Runtime

---

## 1. VISÃO GERAL — FLUXO DE DADOS OPERACIONAIS

```
 ┌──────────────────────── FONTES DE ENTRADA ────────────────────────┐
 │                                                                     │
 │  Chat IA     Chat Interno    Registro     Pró-Ação    Ordens de   │
 │  (Impetus)   (colaboradores) Inteligente              Serviço      │
 │     │              │              │           │           │        │
 └─────┼──────────────┼──────────────┼───────────┼───────────┼────────┘
       │              │              │           │           │
       ▼              ▼              ▼           ▼           ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │              CLAUDE ANALYTICS PIPELINE                                │
 │                                                                       │
 │  claudeAnalyticsService.js                                           │
 │  ┌───────────────────┐  ┌──────────────────────────────────┐        │
 │  │ ingestChatImpetus │  │ ingestInternalChat               │        │
 │  │ (❌ NÃO CONECTADO)│  │ (✅ conectado via routes)        │        │
 │  └───────────────────┘  └──────────────────────────────────┘        │
 │  ┌───────────────────┐  ┌──────────────────────────────────┐        │
 │  │ ingestRegistro    │  │ ingestProacao                    │        │
 │  │ (✅ conectado)    │  │ (✅ conectado)                   │        │
 │  └───────────────────┘  └──────────────────────────────────┘        │
 │  ┌───────────────────┐                                               │
 │  │ ingestOrdemServico│                                               │
 │  │ (✅ disponível)   │                                               │
 │  └───────────────────┘                                               │
 │                                                                       │
 │  → Claude extractOperationalFacts()                                  │
 │  → Extrai: facts[], corporate_events[]                               │
 └───────────┬──────────────────────────────┬────────────────────────────┘
             │                              │
             ▼                              ▼
 ┌───────────────────────┐    ┌──────────────────────────────────────┐
 │ MEMÓRIA OPERACIONAL   │    │ MEMÓRIA CORPORATIVA                   │
 │                       │    │                                        │
 │ operationalMemory     │    │ corporateMemoryService.js              │
 │ Service.js            │    │                                        │
 │                       │    │ ┌──────────────────┐                   │
 │ ┌──────────────────┐  │    │ │ knowledge_memory  │ (eventos)        │
 │ │ operational_memory│  │    │ └──────────────────┘                   │
 │ │ (fatos)          │  │    │ ┌──────────────────┐                   │
 │ └──────────────────┘  │    │ │ casos_manutencao  │ (diagnósticos)   │
 │ ┌──────────────────┐  │    │ └──────────────────┘                   │
 │ │ memory_audit_log │  │    │ ┌──────────────────┐                   │
 │ │ (auditoria)      │  │    │ │ eventos_empresa   │ (timeline)       │
 │ └──────────────────┘  │    │ └──────────────────┘                   │
 │                       │    │ ┌──────────────────┐                   │
 │ Tipos de fato:        │    │ │ tasks             │ (ações criadas)  │
 │ pendencia, risco,     │    │ └──────────────────┘                   │
 │ decisao, solicitacao, │    │                                        │
 │ falha, tarefa,        │    │ Cria tasks quando tipo='tarefa'        │
 │ informacao, observacao│    │ com scheduled_at, assignee             │
 │ padrao, recorrencia,  │    │                                        │
 │ feedback, contexto    │    │ Cria casos_manutencao quando           │
 │                       │    │ tipo='manutencao'|'falha'|'troca_peca' │
 └───────────────────────┘    └──────────────────────────────────────┘
```

---

## 2. MAPA DE CONECTIVIDADE — CHAT IA

```
 ┌───────────────────────────────────────────────────────────────────┐
 │                    CHAT IA — FLUXO COMPLETO                       │
 └───────────────────────────────────────────────────────────────────┘

 USUÁRIO
   │
   ├── [Socket.IO] send_message
   │         │
   │         ▼
   │    chatSocket.js
   │         │
   │         ├── chatService.saveMessage() → chat_messages (DB) ✅
   │         │
   │         ├── mentionsAI(content) ?
   │         │         │
   │         │    [SIM] → handleAIMessage() via loader ✅
   │         │         │
   │         │         ▼
   │         │    chatAIService.loader.js
   │         │         │
   │         │         ├── [canary: legacy ou consolidated]
   │         │         │
   │         │         ▼
   │         │    chatAIService.js (legacy)
   │         │    OU chatAIService.consolidated.js
   │         │         │
   │         │         ├── secureContextBuilder.buildContext()    ✅
   │         │         ├── documentContext (LGPD, docs)           ✅
   │         │         ├── claudeAnalytics.getContextForChat()   ❌ NÃO CONECTADO
   │         │         ├── operationalMemory.getRelevantContext() ❌ NÃO CONECTADO
   │         │         │
   │         │         ▼
   │         │    openai.chat.completions.create({
   │         │      model, messages, max_tokens
   │         │      tools: ❌ NÃO CONFIGURADO
   │         │    })
   │         │         │
   │         │         ▼
   │         │    chatService.saveMessage(reply) → chat_messages ✅
   │         │    io.emit('new_message', saved)                  ✅
   │         │         │
   │         │         ├── claudeAnalytics.ingestChatImpetus()   ❌ NÃO CHAMADO
   │         │         └── corporateMemory.persist...             ❌ NÃO CHAMADO
   │         │
   │         └── [SEMPRE para text ≥ 3 chars]
   │                   │
   │                   ▼
   │              operationalRealtimeCoordinator
   │              .processChatMessage()                           ✅
   │                   │
   │                   ├── geminiService.classifyRouting()        ✅
   │                   ├── findUsersByRoles()                     ✅
   │                   ├── filterUsersByAccess()                  ✅
   │                   ├── notifyUsers() via unifiedMessaging     ✅
   │                   ├── createTask() [se should_create_task]   ✅
   │                   ├── saveTaskWatchers()                     ✅
   │                   └── io.emit('ai_operational_dispatch')     ✅
   │
   └── RESPOSTA FINAL → USUÁRIO VÊ NO CHAT
```

---

## 3. MAPA DE CONECTIVIDADE — REMINDER ENGINE

```
 ┌───────────────────────────────────────────────────────────────────┐
 │                   REMINDER SCHEDULER — FLUXO                      │
 └───────────────────────────────────────────────────────────────────┘

 server.js
   │
   └── reminderScheduler.start()
             │
             ├── setInterval(runReminderCheck, 60000) — a cada 60s
             │
             ▼
        runReminderCheck()
             │
             ├── SELECT FROM tasks WHERE
             │     company_id IS NOT NULL
             │     AND status != 'done'
             │     AND scheduled_at IS NOT NULL
             │     AND (scheduled_at - 70min) <= now()
             │     AND reminder_sent_at IS NULL
             │     AND scheduled_at >= cutoff (15 min window)
             │
             ▼
        processTaskReminder(task)
             │
             ├── Resolve assignee → user_id (por nome)
             ├── Busca task_watchers → adiciona ao recipientIds
             │
             ├── Se recipientIds vazio → marca reminder_sent_at
             │
             ├── Para cada recipient:
             │     unifiedMessaging.sendToUser()
             │       ├── INSERT INTO app_notifications ✅
             │       ├── INSERT INTO communications    ✅
             │       └── io.emit('app_notification')   ✅
             │
             └── Se delivered > 0 → UPDATE tasks SET reminder_sent_at = now()
```

---

## 4. MAPA DE CONECTIVIDADE — PROACTIVE MESSAGING

```
 ┌───────────────────────────────────────────────────────────────────┐
 │              AI PROACTIVE MESSAGING — FLUXO                       │
 └───────────────────────────────────────────────────────────────────┘

 Trigger (qualquer serviço)
   │
   └── aiProactiveMessagingService.sendProactiveMessage({
         companyId, recipientPhone, recipientUserId, message, triggerType
       })
             │
             ├── shouldSendProactive()
             │     ├── isWithinBusinessHours() → 8h-18h seg-sex
             │     ├── getProactiveCountToday() → ≤ 5/dia
             │     └── hasProactiveConsent() → ai_proactive_consent
             │
             ├── [SE ok] INSERT INTO ai_outbound_audit (ANTES de enviar)
             │
             ├── appImpetusService.sendMessage() → WhatsApp/Z-API
             │
             ├── appImpetusService.logOutboundCommunication() → communications
             │
             └── UPDATE ai_outbound_audit SET success/error
```

---

## 5. MAPA DE TABELAS OPERACIONAIS

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                    TABELAS — MEMÓRIA & TASKS                        │
 ├─────────────────────────────────────────────────────────────────────┤
 │                                                                     │
 │  tasks                          operational_memory                  │
 │  ├── id (uuid)                  ├── id                              │
 │  ├── company_id                 ├── company_id                      │
 │  ├── title                      ├── scope_type (user/sector/...)    │
 │  ├── description                ├── scope_id                        │
 │  ├── assignee (nome)            ├── scope_label                     │
 │  ├── assigned_to (uuid)         ├── fact_type                       │
 │  ├── status (open/done)         ├── content                         │
 │  ├── scheduled_at               ├── summary                         │
 │  ├── reminder_sent_at           ├── priority (baixa/normal/alta/cr.)│
 │  ├── origem_conversa            ├── source_type                     │
 │  └── created_at                 ├── source_id                       │
 │                                 ├── source_metadata (jsonb)         │
 │  task_watchers                  ├── metadata (jsonb)                │
 │  ├── task_id                    ├── is_active                       │
 │  └── user_id                    └── created_at                      │
 │                                                                     │
 │  knowledge_memory               casos_manutencao                    │
 │  ├── id                         ├── id                              │
 │  ├── company_id                 ├── company_id                      │
 │  ├── tipo_evento                ├── equipamento                     │
 │  ├── descricao                  ├── linha                           │
 │  ├── equipamento                ├── problema                        │
 │  ├── linha                      ├── causa                           │
 │  ├── usuario                    ├── solucao                         │
 │  ├── source_type                ├── peca_trocada                    │
 │  ├── source_id                  ├── tecnico                         │
 │  ├── source_metadata            └── data                            │
 │  ├── tags                                                           │
 │  └── data                       eventos_empresa                     │
 │                                 ├── id                              │
 │  memory_audit_log               ├── company_id                      │
 │  ├── id                         ├── tipo_evento                     │
 │  ├── company_id                 ├── origem                          │
 │  ├── user_id                    ├── equipamento                     │
 │  ├── action                     ├── linha                           │
 │  ├── scope_filter               ├── descricao                       │
 │  ├── facts_count                ├── knowledge_memory_id             │
 │  ├── source_type                └── task_id                         │
 │  ├── ip_address                                                     │
 │  └── user_agent                                                     │
 │                                                                     │
 ├─────────────────────────────────────────────────────────────────────┤
 │                    TABELAS — CHAT & MESSAGING                       │
 ├─────────────────────────────────────────────────────────────────────┤
 │                                                                     │
 │  chat_conversations             chat_messages                       │
 │  ├── id                         ├── id                              │
 │  ├── company_id                 ├── conversation_id                 │
 │  ├── type (private/group)       ├── sender_id                       │
 │  ├── name                       ├── message_type                    │
 │  ├── created_by                 ├── content                         │
 │  └── updated_at                 ├── file_url                        │
 │                                 ├── reply_to                        │
 │  chat_participants              └── created_at                      │
 │  ├── conversation_id                                                │
 │  ├── user_id                    app_notifications                   │
 │  └── role                       ├── id                              │
 │                                 ├── company_id                      │
 │  internal_chat_conversations    ├── recipient_id                    │
 │  ├── id                         ├── text_content                    │
 │  ├── company_id                 ├── sent_via_socket                 │
 │  ├── participant_ids (uuid[])   └── created_at                      │
 │  ├── type (direct)                                                  │
 │  └── last_message_at            communications                      │
 │                                 ├── id                              │
 │  ai_outbound_audit              ├── company_id                      │
 │  ├── id                         ├── source                          │
 │  ├── company_id                 ├── text_content                    │
 │  ├── recipient_user_id          ├── direction                       │
 │  ├── recipient_phone            ├── status                          │
 │  ├── trigger_type               └── recipient_id                    │
 │  ├── message_preview                                                │
 │  ├── lgpd_consent_verified      ai_proactive_consent                │
 │  ├── success                    ├── user_id                         │
 │  ├── sent_at                    ├── company_id                      │
 │  ├── error_message              ├── granted                         │
 │  └── zapi_message_id            ├── granted_at                      │
 │                                 └── revoked_at                      │
 └─────────────────────────────────────────────────────────────────────┘
```

---

## 6. ESTADO DOS SERVIÇOS — HEAT MAP

| Serviço | Funcional | Conectado ao Chat IA | Conectado ao Frontend |
|---|:---:|:---:|:---:|
| `chatService.js` | ✅ | ✅ | ✅ |
| `chatAIService.loader.js` | ✅ | ✅ | ✅ |
| `chatAIService.consolidated.js` | ✅ | ✅ | ✅ |
| `chatUserContext.js` | ✅ | ✅ | — |
| `secureContextBuilder.js` | ✅ | ✅ | — |
| `documentContext.js` | ✅ | ✅ | — |
| `operationalMemoryService.js` | ✅ | ❌ | ❌ |
| `corporateMemoryService.js` | ✅ | ❌ | ❌ |
| `claudeAnalyticsService.js` | ✅ | ❌ | — |
| `reminderSchedulerService.js` | ✅ | ❌ | ❌ |
| `operationalRealtimeCoordinator.js` | ✅ | ✅ (paralelo) | ❌ |
| `unifiedMessagingService.js` | ✅ | ❌ | ❌ |
| `aiProactiveMessagingService.js` | ✅ | ❌ | ❌ |
| `learningMemoryService.js` | ✅ | ❌ | ❌ |
| `internalChatService.js` | ✅ | — | ✅ |

**Legenda:** ✅ = Conectado e funcional | ❌ = Não conectado | — = N/A

---

## 7. GAPS CRÍTICOS — PRIORIZAÇÃO

| # | Gap | Impacto | Esforço | Risco |
|---|---|:---:|:---:|:---:|
| G1 | System prompt sem instruções de ação | CRÍTICO | BAIXO | BAIXO |
| G2 | Sem tool calling na IA | CRÍTICO | MODERADO | MODERADO |
| G3 | Chat IA não consulta memória | ALTO | BAIXO | BAIXO |
| G4 | Chat IA não ingere na memória | ALTO | BAIXO | BAIXO |
| G5 | API REST de tasks incompleta | MODERADO | MODERADO | BAIXO |
| G6 | Frontend sem UI de tasks | MODERADO | ALTO | BAIXO |
| G7 | Limites éticos não explícitos no prompt | ALTO | BAIXO | BAIXO |

---

## 8. RECOMENDAÇÃO DE ATIVAÇÃO — QUICK WINS

### Quick Win 1: Memory Binding (1-2 horas)
Conectar `claudeAnalyticsService.getContextForChat()` ao `chatAIService.consolidated.js`.
**Resultado:** IA responde com contexto de memória operacional + corporativa.

### Quick Win 2: Ingest Binding (30 minutos)
Adicionar chamada a `claudeAnalytics.ingestChatImpetus()` após cada resposta IA.
**Resultado:** Conversas com IA alimentam a memória.

### Quick Win 3: Action Prompt (1 hora)
Adicionar seção no system prompt instruindo a IA a retornar JSON estruturado para ações.
**Resultado:** IA extrai tarefas/lembretes da conversa (sem executar ainda).

### Quick Win 4: Ethical Limits (30 minutos)
Adicionar regras éticas ao system prompt (sem imputar culpa, sem ranking, sem acusações).
**Resultado:** Governance ética explícita.

---

## 9. INDICADORES DE MATURIDADE

| Dimensão | Estado Atual | Potencial | Nível |
|---|---|---|:---:|
| Persistência de conversas | 100% | 100% | 5/5 |
| Memória operacional | 80% | 100% | 4/5 |
| Memória corporativa | 80% | 100% | 4/5 |
| Extração de fatos (Claude) | 70% | 95% | 3/5 |
| Criação automática de tasks | 60% | 95% | 3/5 |
| Lembretes agendados | 90% (engine) / 0% (binding IA) | 100% | 2/5 |
| Tool calling | 0% | 100% | 0/5 |
| IA com contexto de memória | 0% | 100% | 0/5 |
| Ingestão do chat IA | 0% | 100% | 0/5 |
| Notificações proativas | 80% | 100% | 4/5 |
| LGPD / Governance | 70% | 95% | 3/5 |
| Frontend de tasks | 0% | 100% | 0/5 |

---

**Este mapa é um artefato READ-ONLY de investigação. Nenhuma alteração foi feita no runtime, governance, ou pipelines existentes.**
