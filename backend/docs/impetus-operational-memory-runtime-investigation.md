# IMPETUS — Investigação Arquitetural Profunda
## "Operational Memory & Task Orchestration Runtime"

**Data:** 2026-05-13  
**Tipo:** READ-ONLY Investigation  
**Escopo:** Mapeamento completo de infraestrutura existente, parcial, dormant e ausente

---

## 1. SUMÁRIO EXECUTIVO

O Impetus possui **infraestrutura substancial** para funcionar como memória operacional viva. A afirmação "não posso criar lembretes" é uma **regressão conceitual** — o sistema já possui:

- **Tabela `tasks`** com campos `scheduled_at`, `reminder_sent_at`, `assignee`, `assigned_to`
- **`reminderSchedulerService.js`** — scheduler ativo (intervalo 60s) que busca tasks com `scheduled_at` e envia lembretes via `unifiedMessagingService`
- **`corporateMemoryService.js`** — persiste eventos corporativos extraídos pela IA e **cria tarefas automaticamente** quando detectadas em conversas
- **`operationalMemoryService.js`** — armazena fatos estruturados extraídos por Claude com auditoria
- **`claudeAnalyticsService.js`** — pipeline de ingestão assíncrona que usa Claude para extrair fatos de conversas/registros/ações
- **`operationalRealtimeCoordinator.js`** — classificação e roteamento em tempo real de TODAS as mensagens de chat, com criação automática de tarefas e notificações
- **`aiProactiveMessagingService.js`** — envio de mensagens proativas pela IA com LGPD, rate limit, horário comercial e auditoria

A lacuna principal NÃO é infraestrutura. É **binding** — a IA do chat (system prompt + fluxo de resposta) não tem instruções para invocar estes serviços quando o usuário pede explicitamente "me lembre amanhã" ou "crie uma tarefa".

---

## 2. INVENTÁRIO COMPLETO DE INFRAESTRUTURA

### 2.1 Chat Memory & Message Storage

| Componente | Arquivo | Estado |
|---|---|---|
| Chat Service (CRUD completo) | `chatService.js` | **FUNCIONAL** |
| Conversations DB | tabela `chat_conversations` | **FUNCIONAL** |
| Messages DB | tabela `chat_messages` | **FUNCIONAL** |
| Participants DB | tabela `chat_participants` | **FUNCIONAL** |
| Internal Chat Service | `internalChatService.js` | **FUNCIONAL** |
| Internal Conversations DB | tabela `internal_chat_conversations` | **FUNCIONAL** |
| Chat User Context | `chatUserContext.js` | **FUNCIONAL** |
| Chat Metrics | `chatMetricsService.js` | **FUNCIONAL** |

**Detalhes:** O sistema possui DOIS sistemas de chat coexistentes:
1. **Chat IA (Impetus)** — conversa com IA via `chat_conversations` / `chat_messages` / `chat_participants`
2. **Chat Interno** — mensagens entre colaboradores via `internal_chat_conversations`

Ambos são persistentes, com histórico completo, presença online, reações, read receipts, e suporte a arquivos.

### 2.2 Task/Action Systems

| Componente | Arquivo | Estado |
|---|---|---|
| Tabela `tasks` | DB PostgreSQL | **FUNCIONAL** |
| Task API (GET) | `routes/tasks.js` | **FUNCIONAL** (apenas listagem) |
| Task Creation (automática) | `operationalRealtimeCoordinator.js` | **FUNCIONAL** |
| Task Creation (corporate events) | `corporateMemoryService.js` | **FUNCIONAL** |
| Task Watchers | tabela `task_watchers` | **FUNCIONAL** |
| Task Classification | `geminiService.classifyRouting()` | **FUNCIONAL** |
| Task from Incoming Message | `ai.js > processIncomingMessage()` | **FUNCIONAL** |

**Schema da tabela `tasks`:**
- `id`, `company_id`, `title`, `description`, `assignee` (nome), `assigned_to` (UUID), `status`, `scheduled_at`, `reminder_sent_at`, `origem_conversa`

**Lacuna crítica:** Não existe API REST completa para CRUD de tasks (apenas GET /api/tasks). Não há endpoint para criar/atualizar/fechar tasks via frontend. A criação só ocorre via pipelines automáticos (IA classifica → cria).

### 2.3 Reminder Engine

| Componente | Arquivo | Estado |
|---|---|---|
| Reminder Scheduler | `reminderSchedulerService.js` | **FUNCIONAL e ATIVO** |
| Unified Messaging (delivery) | `unifiedMessagingService.js` | **FUNCIONAL** |
| App Notifications DB | tabela `app_notifications` | **FUNCIONAL** |

**Detalhes do Scheduler:**
- **Ativo em produção** — `reminderScheduler.start()` é chamado em `server.js`
- Intervalo: 60 segundos
- Janela: 15 minutos
- Antecedência: 70 minutos (configurável via `IMPETUS_TASK_REMINDER_ADVANCE_MIN`)
- Resolve `assignee` por nome para `user_id`
- Busca `task_watchers` para notificar todos os envolvidos
- Envia via `unifiedMessagingService.sendToUser()` (Socket.IO + DB)
- Marca `reminder_sent_at` na task após envio

**Veredicto:** O engine de lembretes **funciona**. O problema é que a IA nunca cria tasks com `scheduled_at` quando o usuário pede "me lembre amanhã".

### 2.4 Event Backbone & Realtime

| Componente | Arquivo | Estado |
|---|---|---|
| Socket.IO Server | `server.js` | **FUNCIONAL** |
| Chat Socket | `socket/chatSocket.js` | **FUNCIONAL** |
| Voice Stream Socket | `socket/voiceStreamSocket.js` | **FUNCIONAL** |
| Avatar Lipsync Socket | `avatarLipsyncSocket.js` | **FUNCIONAL** |
| Realtime OpenAI Proxy | `realtimeOpenaiProxy.js` | **FUNCIONAL** |
| Operational Realtime Coordinator | `operationalRealtimeCoordinator.js` | **FUNCIONAL** |
| Event Pipeline Bootstrap | `eventPipelineBootstrapService.js` | **FUNCIONAL** |
| Unified Messaging | `unifiedMessagingService.js` | **FUNCIONAL** |

**Fluxo em tempo real:**
1. Mensagem chega via Socket.IO → `chatSocket.js`
2. Se menciona IA → `chatAIService.loader.js` → resposta
3. SEMPRE (todas mensagens text ≥ 3 chars) → `operationalRealtimeCoordinator.processChatMessage()`
4. Gemini classifica routing → cria task + notifica usuários relevantes
5. Emite `ai_operational_dispatch` via Socket.IO

### 2.5 Notification Engine

| Componente | Arquivo | Estado |
|---|---|---|
| Unified Messaging Service | `unifiedMessagingService.js` | **FUNCIONAL** |
| App Notifications DB | tabela `app_notifications` | **FUNCIONAL** |
| Communications DB | tabela `communications` | **FUNCIONAL** |
| TPM Notifications | `tpmNotifications.js` | **FUNCIONAL** |
| Proactive Messaging | `aiProactiveMessagingService.js` | **FUNCIONAL** |
| AI Outbound Audit | tabela `ai_outbound_audit` | **FUNCIONAL** |
| Proactive Consent | tabela `ai_proactive_consent` | **FUNCIONAL** |

**Canais de entrega:**
1. **Socket.IO push** — real-time via `ioInstance.to('user_' + id).emit()`
2. **DB persistence** — `app_notifications` + `communications`
3. **WhatsApp/Z-API** — via `appImpetusService.sendMessage()` (mensagens proativas)

### 2.6 Operational Memory

| Componente | Arquivo | Estado |
|---|---|---|
| Operational Memory Service | `operationalMemoryService.js` | **FUNCIONAL** |
| Operational Memory DB | tabela `operational_memory` | **FUNCIONAL** |
| Memory Audit Log DB | tabela `memory_audit_log` | **FUNCIONAL** |
| Corporate Memory Service | `corporateMemoryService.js` | **FUNCIONAL** |
| Knowledge Memory DB | tabela `knowledge_memory` | **FUNCIONAL** |
| Casos Manutenção DB | tabela `casos_manutencao` | **FUNCIONAL** |
| Eventos Empresa DB | tabela `eventos_empresa` | **FUNCIONAL** |
| Learning Memory | `learningMemoryService.js` | **FUNCIONAL** |
| Cognitive Persistence | `cognitivePersistenceService.js` | **FUNCIONAL** |
| Cognitive DB Persistence | `cognitiveDbPersistenceService.js` | **FUNCIONAL** |
| Voice Naturalness Memory | `voiceNaturalnessMemory.js` | **FUNCIONAL** |

**Tipos de memória existentes:**

1. **Memória Operacional** — fatos estruturados por scope (user, sector, machine, line, process, org), tipos (pendencia, risco, decisao, solicitacao, falha, tarefa, informacao, observacao, padrao, recorrencia, feedback, contexto), com prioridade e full-text search
2. **Memória Corporativa** — eventos da empresa com knowledge_memory, casos_manutencao, eventos_empresa, criação automática de tasks
3. **Learning Memory** — interações IA em memória (RAM + JSON persistence + DB), com insights
4. **Voice Memory** — naturalidade e preferências de voz

### 2.7 Claude/GPT Integration

| Componente | Arquivo | Estado |
|---|---|---|
| Claude Service | `claudeService.js` | **FUNCIONAL** |
| OpenAI Service (ai.js) | `ai.js` | **FUNCIONAL** |
| Claude Analytics Pipeline | `claudeAnalyticsService.js` | **FUNCIONAL** |
| Gemini Service | `geminiService.js` | **FUNCIONAL** |
| AI Orchestrator | `aiOrchestrator.js` | **FUNCIONAL** |
| Cognitive Orchestrator | `ai/cognitiveOrchestrator.js` | **FUNCIONAL** |
| AI Security Gateway | `aiSecurityGateway.js` | **FUNCIONAL** |
| AI Provider Service | `aiProviderService.js` | **FUNCIONAL** |
| AI Prompt Guard | `aiPromptGuardService.js` | **FUNCIONAL** |

**Fluxo de extração (Claude Analytics):**
1. `ingestChatImpetus()` / `ingestInternalChat()` / `ingestRegistroInteligente()` / `ingestProacao()` / `ingestOrdemServico()`
2. → `ingestAsync()` → Claude `extractOperationalFacts()`
3. → `operationalMemoryService.storeFacts()` (fatos estruturados)
4. → `corporateMemoryService.persistCorporateEvents()` (eventos + tasks automáticas)

**Integração de contexto para chat:**
- `claudeAnalyticsService.getContextForChat()` → busca fatos relevantes e histórico corporativo → enriquece system prompt

### 2.8 AI System Prompt & Governance

| Componente | Arquivo | Estado |
|---|---|---|
| Governance Policy (texto) | `impetusAIGovernancePolicy.txt` | **FUNCIONAL** |
| Orchestrator Protocol (texto) | `impetusCentralOrchestratorProtocol.txt` | **FUNCIONAL** |
| Governance Loader | `impetusAIGovernancePolicy.js` | **FUNCIONAL** |
| System Prompt Builder | `ai/core/systemPrompt.js` | **FUNCIONAL** |
| Secure Context Builder | `secureContextBuilder.js` | **FUNCIONAL** |

**Observação crítica:** O system prompt NÃO inclui instruções sobre:
- Criação de tarefas
- Criação de lembretes
- Extração de entidades (data, hora, responsável)
- Invocação de ferramentas (tool calling)
- Capacidade de agendar ações

O prompt foca em **governança hierárquica** e **filtragem de informação**, não em **ação operacional**.

### 2.9 Canary Rollout / Service Selection

| Componente | Arquivo | Estado |
|---|---|---|
| Chat AI Loader (canary) | `chatAIService.loader.js` | **FUNCIONAL** |
| Legacy Chat AI | `chatAIService.js` | **FUNCIONAL** |
| Consolidated Chat AI | `chatAIService.consolidated.js` | **FUNCIONAL** |

**Detalhe:** O loader implementa canary rollout com circuit breaker, hash-based bucket assignment, e failover automático entre versões. Controlado por:
- `CHAT_ENABLE_CONSOLIDATED` — habilita consolidated
- `CHAT_SAFE_MODE` — safe mode obrigatório
- `CHAT_ROLLOUT_PERCENT` — percentual de tráfego

---

## 3. DIAGNÓSTICO: POR QUE "NÃO POSSO CRIAR LEMBRETES"?

### 3.1 Gaps Identificados

| # | Gap | Severidade | Natureza |
|---|---|---|---|
| G1 | **System prompt não instrui sobre ações operacionais** | CRÍTICA | Design |
| G2 | **Nenhum tool calling / function calling configurado** | CRÍTICA | Ausente |
| G3 | **Nenhum binding IA → criação de task via chat** | CRÍTICA | Desconexão |
| G4 | **API REST incompleta para tasks** | ALTA | Incompleto |
| G5 | **Claude Analytics não conectado ao chat consolidado** | ALTA | Desconexão |
| G6 | **Memória operacional não consultada no chat** | MODERADA | Desconexão |
| G7 | **Scheduler funciona, mas IA não alimenta o scheduler** | CRÍTICA | Desconexão |

### 3.2 Análise Detalhada de Cada Gap

**G1 — System Prompt não instrui sobre ações:**
O `impetusAIGovernancePolicy.txt` (500+ linhas) foca 100% em governança hierárquica, filtragem de informação, e priorização de exibição. Em **nenhum ponto** instrui a IA sobre:
- "Quando o usuário pedir para criar uma tarefa, extraia título, descrição, responsável e data"
- "Quando o usuário pedir 'me lembre amanhã', crie uma tarefa com scheduled_at"
- "Você pode criar lembretes, tarefas e ações a partir de conversas"

**G2 — Sem tool calling:**
Tanto `chatAIService.js` (legacy) quanto `chatAIService.consolidated.js` fazem chamadas simples a `openai.chat.completions.create()` **sem `tools`/`functions` parameter**. A IA não tem acesso a ferramentas. Recebe texto → retorna texto. Não há mechanism para a IA invocar `createTask()`, `storeFacts()` ou qualquer ação.

**G3 — Binding IA → Task inexistente no chat:**
O `operationalRealtimeCoordinator.js` cria tarefas automaticamente em **todas** as mensagens de chat (usa Gemini para classificar). MAS este fluxo é paralelo e independente da resposta IA. A IA **responde texto**, o coordinator **age em background**. A IA não sabe que o coordinator criou uma task, e o coordinator não sabe que a IA prometeu algo ao usuário.

**G4 — API REST incompleta:**
O endpoint `routes/tasks.js` só tem `GET /`. Não existe `POST`, `PUT`, `DELETE`, `PATCH`. A criação ocorre apenas internamente (`db.query INSERT INTO tasks`).

**G5 — Claude Analytics não conectado ao chat AI:**
O `claudeAnalyticsService` é chamado a partir de:
- `routes/internalChat.js` (chat interno entre colaboradores)
- `routes/intelligentRegistration.js` (registro inteligente)
- `operationalBrainEngine.js`

**NÃO** é chamado a partir de:
- `chatAIService.js` (chat IA legacy)
- `chatAIService.consolidated.js` (chat IA consolidado)
- `chatSocket.js` (socket de chat, exceto via `operationalRealtimeCoordinator`)

Isso significa que conversas com a IA no chat Impetus **não alimentam a memória corporativa/operacional** diretamente.

**G6 — Memória operacional não consultada:**
O `chatAIService.consolidated.js` usa apenas `documentContext` + `secureContextBuilder` para contexto. NÃO chama `claudeAnalyticsService.getContextForChat()`. A memória operacional rica não é injetada no prompt da IA.

**G7 — Scheduler funciona mas IA não alimenta:**
O `reminderSchedulerService.js` está ativo e funciona. Ele consulta `tasks WHERE scheduled_at IS NOT NULL AND reminder_sent_at IS NULL`. Mas a IA nunca cria tasks com `scheduled_at` porque:
1. Não tem instruções para fazê-lo
2. Não tem tool calling para invocar criação de task
3. O `chatAIService` não integra com `corporateMemoryService` nem com o coordinator

---

## 4. CAPABILITY MATRIX

| Capacidade | Existe | Parcial | Faltante | Dormant | Seguro Ativar |
|---|---|---|---|---|---|
| Persistir mensagens de chat | SIM | — | — | — | — |
| Histórico de conversas com IA | SIM | — | — | — | — |
| Criar tasks automaticamente (de chat) | — | SIM* | — | — | — |
| Criar tasks via pedido do usuário ("me crie uma tarefa") | — | — | SIM | — | SIM |
| Lembretes agendados (scheduler) | SIM | — | — | — | — |
| IA criar lembrete por pedido ("me lembre amanhã") | — | — | SIM | — | SIM |
| Extração de fatos por Claude | SIM | — | — | — | — |
| Alimentar memória a partir do chat IA | — | — | SIM | — | SIM |
| Consultar memória operacional no chat IA | — | — | SIM | — | SIM |
| Classificação de eventos (Gemini) | SIM | — | — | — | — |
| Notificações em tempo real (Socket.IO) | SIM | — | — | — | — |
| Notificações push (app) | SIM | — | — | — | — |
| Mensagens proativas (WhatsApp/Z-API) | SIM | — | — | — | — |
| LGPD consent management | SIM | — | — | — | — |
| Rate limiting proativo | SIM | — | — | — | — |
| Horário comercial enforcement | SIM | — | — | — | — |
| Auditoria de ações IA | SIM | — | — | — | — |
| Tool calling / Function calling | — | — | SIM | — | SIM |
| Memória corporativa (knowledge_memory) | SIM | — | — | — | — |
| Casos de manutenção (banco de conhecimento) | SIM | — | — | — | — |
| Criação de tarefas a partir de eventos corporativos | SIM | — | — | — | — |
| Task watchers (notificação de envolvidos) | SIM | — | — | — | — |
| Resolução de assignee por nome | SIM | — | — | — | — |
| Dashboard de tasks (frontend) | — | — | SIM | — | SIM |
| CRUD completo de tasks via API | — | — | SIM | — | SIM |
| Busca semântica na memória | — | SIM** | — | — | — |
| Pipeline de ingestão multi-fonte | SIM | — | — | — | — |

*\* Tasks são criadas automaticamente pelo coordinator, mas a IA não as cria por pedido do usuário.*  
*\*\* Full-text search (plainto_tsquery) existe em operationalMemoryService; busca semântica vetorial parcial via pgvector.*

---

## 5. FLUXOS REAIS — DEMONSTRAÇÃO DE 8 CENÁRIOS

### Cenário 1: "Me lembre amanhã de verificar a máquina X"
**Estado atual:** IA responde com texto ("Ok, vou anotar" ou "Não consigo criar lembretes"). **Nenhuma task é criada**, nenhum scheduler é acionado.
**O que já existe:** `reminderSchedulerService.js` ativo, `tasks.scheduled_at`, `unifiedMessagingService` para delivery.
**Gap:** IA não tem tool calling para `INSERT INTO tasks (scheduled_at = tomorrow)`.

### Cenário 2: "Crie uma tarefa para o João trocar o rolamento da máquina 5"
**Estado atual:** O `operationalRealtimeCoordinator` pode criar uma task SE Gemini classificar como `should_create_task: true`. Mas a IA não confirma ao usuário, e o assignee é por role (mecânico), não por nome.
**O que já existe:** `operationalRealtimeCoordinator.createTask()`, `reminderSchedulerService.resolveAssigneeToUserId()`.
**Gap:** IA não tem binding para criar task com dados específicos do pedido.

### Cenário 3: "O que aconteceu na linha 3 esta semana?"
**Estado atual:** Se a memória corporativa tem eventos da linha 3, `claudeAnalyticsService.getContextForChat()` poderia retornar o contexto. Mas esta função **não é chamada** pelo chat IA.
**O que já existe:** `corporateMemoryService.getRelevantContext()`, `operationalMemoryService.getRelevantContext()`.
**Gap:** Chat AI não integra com `getContextForChat()`.

### Cenário 4: "Quais tarefas estão abertas para mim?"
**Estado atual:** API `GET /api/tasks` retorna todas as tasks da empresa. Frontend não renderiza.
**O que já existe:** Tabela `tasks` com `assignee`, `assigned_to`, `status`.
**Gap:** Sem filtro por usuário no endpoint, sem interface frontend.

### Cenário 5: "Envie um alerta para o supervisor sobre a pressão da caldeira"
**Estado atual:** `operationalRealtimeCoordinator` já faz isso automaticamente em background. Mas a IA não confirma nem permite personalizar o alerta.
**O que já existe:** `unifiedMessagingService.sendToUser()`, Socket.IO push, `findUsersByRoles()`.
**Gap:** IA sem controle para enviar notificações explícitas.

### Cenário 6: "Resuma os últimos diagnósticos de falhas"
**Estado atual:** IA não consulta memória. Responde com conhecimento genérico.
**O que já existe:** `knowledge_memory`, `casos_manutencao` com histórico completo.
**Gap:** Binding entre chat IA e consulta a memória corporativa.

### Cenário 7: "Registre que troquei o rolamento do motor 15"
**Estado atual:** O `registroInteligente` frontend permite registro, que é processado por `intelligentRegistrationService` e ingerido por `claudeAnalytics`. Mas no chat, a IA não consegue registrar.
**O que já existe:** `corporateMemoryService.persistCorporateEvents()` com tipo `troca_peca`.
**Gap:** Chat IA não invoca persistência de eventos corporativos.

### Cenário 8: "Me avise quando a manutenção preventiva vencer"
**Estado atual:** IA não cria alertas programados.
**O que já existe:** `tasks` com `scheduled_at`, scheduler ativo, `task_watchers`.
**Gap:** IA não tem ferramenta para criar task agendada + watchers.

---

## 6. ANÁLISE DE GOVERNANCE & LGPD

### 6.1 Conformidade LGPD

O sistema já implementa:
- **Consentimento explícito** — `ai_proactive_consent` (tabela) com `granted/revoked_at`
- **Rate limiting** — máx 5 mensagens proativas/dia por usuário
- **Horário comercial** — mensagens proativas só 8h-18h, seg-sex
- **Auditoria completa** — `ai_outbound_audit` com IP, status, preview
- **Memory audit log** — `memory_audit_log` para consultas à memória operacional
- **LGPD Protocol** — `documentContext.getImpetusLGPDComplianceProtocol()` injetado em prompts

### 6.2 Limites Éticos

O system prompt (`impetusAIGovernancePolicy.txt`) **não** contém regras sobre:
- Proibição de imputar culpa
- Proibição de ranking de produtividade individual
- Proibição de acusações
- Proibição de inferências sobre comportamento pessoal

Estes limites precisam ser adicionados explicitamente quando a IA ganhar capacidade de criar tarefas/lembretes/notificações.

### 6.3 Data Scope & Multi-tenancy

- **company_id** é filtro obrigatório em TODAS as consultas de memória
- Isolamento por tenant está correto em todos os serviços auditados
- `filterUsersByAccess()` em `roleAccessPolicy` filtra targets de notificação

---

## 7. MAPA DE DESCONEXÕES (ROOT CAUSE)

```
┌─────────────────────────────────────────────────────┐
│              CHAT IA (user ↔ AI)                     │
│  chatSocket.js → chatAIService.loader → LLM         │
│                                                       │
│  ❌ Sem tool calling                                  │
│  ❌ Sem binding para criar tasks                      │
│  ❌ Sem consulta à memória operacional                │
│  ❌ Sem ingestão na memória corporativa               │
│  ❌ System prompt sem instruções de ação              │
└──────────────┬──────────────────────────────────────┘
               │ (desconexão)
               ▼
┌─────────────────────────────────────────────────────┐
│         INFRAESTRUTURA OPERACIONAL                    │
│                                                       │
│  ✅ operationalRealtimeCoordinator (tasks automáticas)│
│  ✅ claudeAnalyticsService (ingestão de memória)      │
│  ✅ reminderSchedulerService (lembretes)              │
│  ✅ unifiedMessagingService (notificações)            │
│  ✅ operationalMemoryService (fatos estruturados)     │
│  ✅ corporateMemoryService (eventos + knowledge)      │
│  ✅ aiProactiveMessagingService (mensagens proativas)  │
└─────────────────────────────────────────────────────┘
```

**A infra existe. O binding é que está ausente.**

---

## 8. ROADMAP — 6 FASES PARA ATIVAÇÃO SEGURA

### Fase 1 — Memory Binding (Consulta)
**Objetivo:** A IA consulta a memória antes de responder.
- Integrar `claudeAnalyticsService.getContextForChat()` no `chatAIService.consolidated.js`
- Injetar bloco de memória operacional + corporativa no system prompt
- **Risco:** Baixo. Apenas leitura. Não altera comportamento.

### Fase 2 — Chat Ingest Binding (Escrita passiva)
**Objetivo:** Conversas com IA alimentam a memória.
- Chamar `claudeAnalytics.ingestChatImpetus()` após cada resposta da IA no chat consolidado
- **Risco:** Baixo. Assíncrono, fire-and-forget. Já funciona para chat interno.

### Fase 3 — Action Prompt Enhancement
**Objetivo:** System prompt instrui a IA sobre capacidades operacionais.
- Adicionar seção ao system prompt: "Quando o usuário pedir tarefa/lembrete/alerta, retorne JSON estruturado com action_type, título, descrição, data, responsável"
- **Risco:** Moderado. Requer validação de que a IA extrai corretamente.

### Fase 4 — Tool Calling Implementation
**Objetivo:** IA pode invocar ferramentas reais.
- Implementar `tools` parameter no `openai.chat.completions.create()`:
  - `create_task` — cria task com título, descrição, assignee, scheduled_at
  - `create_reminder` — cria task com scheduled_at (alias)
  - `query_memory` — consulta memória operacional
  - `send_notification` — notifica usuário específico
- Governance: cada tool tem rate limit, auditoria, e validação de permissão
- **Risco:** Moderado-Alto. Requer shadow mode antes de produção.

### Fase 5 — Task CRUD API & Frontend
**Objetivo:** Tasks acessíveis via interface.
- Expandir `routes/tasks.js` com POST, PUT, PATCH, DELETE
- Criar componente frontend para visualização e gestão de tasks
- **Risco:** Moderado. Requer design de UX.

### Fase 6 — Proactive Intelligence
**Objetivo:** IA age proativamente (com consentimento).
- Scheduler enriquecido: não apenas lembretes, mas análise de contexto
- IA sugere ações baseadas em padrões detectados na memória
- **Risco:** Alto. Requer consentimento LGPD, rate limiting rigoroso.

---

## 9. RESPOSTAS ÀS 10 PERGUNTAS FINAIS

### 1. O Impetus tem memória operacional?
**SIM.** `operationalMemoryService.js` + `corporateMemoryService.js` + `learningMemoryService.js` + tabelas `operational_memory`, `knowledge_memory`, `casos_manutencao`, `eventos_empresa`.

### 2. O Impetus consegue criar tarefas a partir de conversas?
**SIM, parcialmente.** `operationalRealtimeCoordinator` e `corporateMemoryService` criam tasks automaticamente. Mas a IA do chat não cria por pedido explícito.

### 3. O Impetus tem sistema de lembretes?
**SIM.** `reminderSchedulerService.js` está ativo em produção. Verifica tasks com `scheduled_at` a cada 60 segundos e notifica via Socket.IO + DB.

### 4. O Impetus pode enviar mensagens proativas?
**SIM.** `aiProactiveMessagingService.js` com consentimento LGPD, rate limit, horário comercial, e auditoria completa.

### 5. Por que a IA diz "não posso criar lembretes"?
**Porque o system prompt não a instrui sobre esta capacidade, e não há tool calling configurado.** A infraestrutura existe mas a IA não sabe que existe.

### 6. A memória operacional é consultada pela IA do chat?
**NÃO atualmente.** `claudeAnalyticsService.getContextForChat()` existe mas não é chamado pelo chat IA. A IA responde sem contexto de memória.

### 7. As conversas com a IA alimentam a memória?
**NÃO.** O chat interno (entre colaboradores) alimenta via `claudeAnalytics.ingestInternalChat()`, mas o chat com a IA (chatAIService) não chama ingestão.

### 8. O sistema respeita LGPD em mensagens proativas?
**SIM.** Consentimento, rate limiting, horário comercial, e auditoria estão implementados.

### 9. Qual é o gap mais crítico?
**O binding entre a IA do chat e a infraestrutura operacional existente.** Toda a infra está pronta; falta conectar.

### 10. É seguro ativar estas capacidades?
**SIM, com as fases corretas.** Fase 1 (read-only memory binding) e Fase 2 (ingest binding) são seguras e de baixo risco. Fase 4 (tool calling) requer shadow mode e validação.

---

## 10. ARQUIVOS AUDITADOS

### Serviços de Chat/IA
- `backend/src/services/chatAIService.js`
- `backend/src/services/chatAIService.consolidated.js`
- `backend/src/services/chatAIService.loader.js`
- `backend/src/services/chatService.js`
- `backend/src/services/internalChatService.js`
- `backend/src/services/chatUserContext.js`
- `backend/src/services/chatMetricsService.js`
- `backend/src/socket/chatSocket.js`

### Serviços de Memória
- `backend/src/services/operationalMemoryService.js`
- `backend/src/services/corporateMemoryService.js`
- `backend/src/services/learningMemoryService.js`
- `backend/src/services/cognitivePersistenceService.js`
- `backend/src/services/cognitiveDbPersistenceService.js`
- `backend/src/services/voiceNaturalnessMemory.js`

### Serviços de IA / LLM
- `backend/src/services/ai.js`
- `backend/src/services/claudeService.js`
- `backend/src/services/claudeAnalyticsService.js`
- `backend/src/services/geminiService.js`
- `backend/src/services/aiOrchestrator.js`
- `backend/src/ai/cognitiveOrchestrator.js`
- `backend/src/ai/core/systemPrompt.js`
- `backend/src/ai/orchestrator.js`

### System Prompt & Governance
- `backend/src/services/impetusAIGovernancePolicy.txt`
- `backend/src/services/impetusCentralOrchestratorProtocol.txt`
- `backend/src/services/impetusAIGovernancePolicy.js`
- `backend/src/services/secureContextBuilder.js`

### Tasks & Reminders
- `backend/src/services/reminderSchedulerService.js`
- `backend/src/services/operationalRealtimeCoordinator.js`
- `backend/src/routes/tasks.js`

### Notificações & Messaging
- `backend/src/services/unifiedMessagingService.js`
- `backend/src/services/aiProactiveMessagingService.js`
- `backend/src/services/tpmNotifications.js`

### Event Pipeline
- `backend/src/services/eventPipelineBootstrapService.js`

### Server & Socket
- `backend/src/server.js`
- `backend/src/socket/chatSocket.js`
- `backend/src/socket/voiceStreamSocket.js`

---

**CONCLUSÃO:** O Impetus é um sistema com infraestrutura operacional madura e completa. A "incapacidade" de criar lembretes e tarefas é uma regressão conceitual, não técnica. Os serviços existem, estão ativos, e funcionam. O gap é exclusivamente de **binding** entre a interface conversacional (chat IA) e a infraestrutura operacional existente.
