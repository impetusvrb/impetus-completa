# SZ5 — Unified Operational Conversational Memory

**Fase:** produção real (não shadow).  
**Runtime:** `backend/src/runtime-z-sovereign/sz5/`  
**API:** `/api/runtime-z-sz5/*`  
**Injector:** `backend/src/middleware/zUnifiedConversationalContextInjector.js`

## Problema resolvido

O chat persistia mensagens, mas o Runtime Z não recuperava factos operacionais autorizados antes do LLM. SZ5 fecha o ciclo:

1. **Preservação de identidade** no histórico (`sender_name`, `thread_id`, hierarquia).
2. **Indexação** por mensagem em PostgreSQL (`z_conversation_message_index`).
3. **Query soberana** com RBAC/tenant (só threads onde o utilizador é participante).
4. **Facts-before-LLM** via injector no `chatAIService.consolidated.js`.

## Arquitectura

```
chat (socket/REST)
  → saveMessage
  → zConversationOperationalIndexerRuntime (async)
  → z_conversation_message_index (PostgreSQL)
  → zOperationalMemoryRuntime (SZ2) + zConversationMemoryGraph

handleAIMessage
  → zUnifiedConversationalContextInjector
       → zOperationalConversationalQueryRuntime (facts)
       → zCognitiveContextInjector (SZ2/SZ3)
       → zOperationalNervousSystemFacade (SZ4)
  → OpenAI (histórico com operationalChatHistoryFormatter)
```

## Wiring (Fase 1 — SZ5-A crítico)

| Componente | Alteração |
|------------|-----------|
| `operationalChatHistoryFormatter.js` | Formato canónico de mensagem |
| `chatAIService.consolidated.js` | Injector SZ5 + histórico com `sender_name` |
| `chatSocket.js` | Indexação pós-`send_message` |
| `zUnifiedConversationalContextInjector.js` | Facts + SZ2/SZ3/SZ4 |

## Indexação

- `zConversationIntentExtractor` — reunião, turnover, perdas, CAPA, NR12, etc.
- `zTemporalExtractor` — amanhã, hora, weekday
- `zActorExtractor` — participantes e remetente
- `zConversationOperationalIndexerRuntime` — registo unificado JSONB

Migração SQL: `backend/src/models/sz5_conversational_memory_migration.sql`  
Auto-create: `zConversationIndexPersistence.ensureTables()`

## Query operacional

`zOperationalConversationalQueryRuntime`:

- Tipos: actor, temporal, meeting, task, follow-up, workflow, cross-thread (via graph links)
- Resposta factual em PT antes do LLM
- Cenário de validação: mensagem sobre reunião turnover → pergunta «o Gustavo marcou reunião amanhã?»

## Governança

`zConversationalGovernanceRuntime`:

- `assertChatAccess` — módulo chat / permissões IA
- SQL scoped: `thread_id IN (SELECT conversation_id FROM chat_participants WHERE user_id = $user)`
- `canExposeActor` — `roleAccessPolicy.canShareWith`

## Memória e cross-thread

`zUnifiedOperationalMemoryRuntime` — tabela `z_operational_memory_links`, correlação entre threads por workflow/actores.

## Follow-up / reminders

`zOperationalFollowupRuntime` — objectos `reminder`, `followup`, `meeting_object`, `operational_task`, `escalation` (assistivo; sem execução autónoma).

## Observabilidade

`zConversationalObservabilityRuntime` — hit rate, latência, `GET /api/runtime-z-sz5/observability`

## APIs (requireAuth + governance)

| Método | Rota |
|--------|------|
| GET | `/health` |
| POST | `/query` |
| GET | `/memory`, `/timeline`, `/actors`, `/workflows`, `/threads` |
| GET | `/followups`, `/meetings`, `/tasks`, `/continuity`, `/graph`, `/observability` |

## Variáveis de ambiente

```env
IMPETUS_SZ5_ENABLED=on
IMPETUS_SZ5_OPERATIONAL_MEMORY=on
IMPETUS_SZ5_QUERY_RUNTIME=on
IMPETUS_SZ5_CONVERSATIONAL_INDEXING=on
IMPETUS_SZ5_CROSS_THREAD_MEMORY=on
IMPETUS_SZ5_FACT_RETRIEVAL=on
IMPETUS_SZ5_API=on
IMPETUS_SZ5_OBSERVABILITY=on
IMPETUS_SZ2_PERSISTENCE=on
```

## Testes

```bash
node backend/tests/runtime-z-sovereign-sz5/runSz5Tests.js
```

Meta: **100+ asserts** (actual: 138+).

## Rollback

1. `IMPETUS_SZ5_ENABLED=off` (desliga injector, indexação, API)
2. `pm2 reload impetus-backend --update-env`
3. Tabelas PostgreSQL podem permanecer (additive-only)

## Invariantes preservados

- Motor A intacto
- Engine V2 intacto
- SZ1/SZ2/SZ3/SZ4 intactos
- `App.jsx` e dashboard context adapter intactos
- Additive-only, governance-first, facts-before-LLM, tenant-safe

## Frontend

`frontend/src/runtime-z-sovereign/sz5/` — painéis de timeline, continuidade, thread inspector (consumo das APIs acima).
