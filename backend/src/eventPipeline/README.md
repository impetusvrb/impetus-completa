# IMPETUS — Event-Driven Pipeline (v2.0)

Camada **aditiva** que materializa o contrato:

```
EVENTO → EVENT BUS → EVENT PROCESSOR → GEMINI (refinamento) → ORQUESTRADOR (Node) → [CHATGPT | CLAUDE | AÇÃO]
```

Está **desligada por omissão**. Nenhum serviço/rota actual depende deste módulo até que
seja explicitamente cabaleado em `bootEventPipeline({ handlers })`.

## Flags

| Variável | Default | Efeito |
|---|---|---|
| `IMPETUS_EVENT_PIPELINE_ENABLED` | `false` | Activa `bootEventPipeline()` (subscritores no bus) |
| `IMPETUS_EVENT_BUS_ADAPTER` | `in_memory` | Adapter do bus (`in_memory`; futuro: `pubsub`) |
| `IMPETUS_EVENT_BUS_LOW_INTERVAL_MS` | `1500` | Janela de batch para prioridade `low` |
| `IMPETUS_SYSTEM_HEALTH_ENABLED` | `false` | Activa loop periódico de snapshots |
| `IMPETUS_EVENT_AUDIT_DB_TABLE` | _(unset)_ | Se definido, audit grava também em PostgreSQL nessa tabela |

## Estrutura do envelope (canónico, `envelope.js`)

```jsonc
{
  "id": "uuid-v4",
  "type": "chat_message | sensor_alert | task_update | external_data | system_health_snapshot",
  "source": "whatsapp | system | machine | api_externa",
  "user": "user_id|null",
  "payload": {},
  "priority": "high|medium|low",
  "timestamp": "ISO 8601"
}
```

Validado com `zod`. Erros lançam `EVENT_ENVELOPE_INVALID`.

## Event Processor (`processor/eventProcessor.js`)

Saída obrigatória:

```jsonc
{
  "intent_pre": "conversation|analysis|task|external_data|system_health",
  "summary": "≤ 500 chars (anonimizado)",
  "entities": ["..."],
  "priority": "high|medium|low",
  "requires_ai": true|false
}
```

Aplica `anonymize.js` (e-mail, CPF, CNPJ, telefone, sequências numéricas longas) antes de qualquer
texto sair do backend.

## Gemini — refinamento (`intent/intentRefinementService.js`)

Recebe **apenas o output do Event Processor** (sumário sanitizado). Devolve:

```jsonc
{ "intent": "...", "confidence": 0..1, "entities": [...], "priority": "..." }
```

Se Gemini estiver indisponível ou falhar após retries, devolve fallback determinístico
(`intent_pre`, `confidence: 0.5`, `refined_by: "fallback"`).

## Orquestrador (`orchestrator/eventOrchestrator.js`)

Roteamento explícito:

| Intent | Acção |
|---|---|
| `conversation` | `send_to_chatgpt(input)` |
| `analysis` | `enqueue_claude_job(input)` (background) |
| `task` | `execute_task(input)` |
| `external_data` | `call_external_api(input) → send_to_chatgpt(...)` |
| `system_health` | `enqueue_claude_job(input)` (background) |

Handlers são **injectados** via `wireOrchestrator({ ... })` — nenhum serviço actual é
acoplado por require neste módulo. Default: handlers no-op com log.

Claude **nunca** é síncrono em rota de utilizador: usa `claudeJobQueue.enqueue(...)`.

## Resiliência (`resilience/aiResilience.js`)

```js
const r = await callWithRetry(() => fetchAi(...), {
  maxRetries: 3,
  baseMs: 500,
  fallback: () => ({ ok: false, content: 'fallback' }),
  metadata: { intent, ia_chamada: 'gemini', event_id }
});
```

- Retries com backoff exponencial + jitter.
- 4xx (400/401/403/404/422) e códigos de firewall (`PROMPT_BLOCKED`) **não retentam**.
- Esgotado, executa `fallback()` se fornecido; senão lança `AI_RETRY_EXHAUSTED`.

## System Health (`health/systemHealthSnapshotService.js`)

```js
const ev = await captureAndPublishSnapshot();
// publishEvent({ type: 'system_health_snapshot', source: 'system', priority: 'medium', payload: { summary: {...} } })
```

`startSystemHealthLoop({ intervalMs: 60_000 })` activa o ciclo (gated por `IMPETUS_SYSTEM_HEALTH_ENABLED`).

## Auditoria (`audit/eventAuditLogger.js`)

Cada execução do pipeline grava `[EVENT_AUDIT]` em stdout (estruturado) e, se `IMPETUS_EVENT_AUDIT_DB_TABLE`
estiver definido, tenta também `INSERT` em PostgreSQL (não cria a tabela — fica a cargo do
sistema de migrations já existente).

## Activação segura no boot

```js
// backend/src/server.js (exemplo — opcional, ainda não chamado)
const { bootEventPipeline } = require('./eventPipeline/pipeline');
const { startSystemHealthLoop } = require('./eventPipeline/health/systemHealthSnapshotService');

bootEventPipeline({
  handlers: {
    send_to_chatgpt: async (input) => existingChatService.replyFromAi(input),
    execute_task: async (input) => existingTaskService.create(input),
    call_external_api: async (input) => existingExternalApiService.call(input),
    claude_handler: async (job) => existingClaudeJobRunner.run(job)
  }
});
startSystemHealthLoop({ intervalMs: 60_000 });
```

Sem chamadas a estas funções, **nenhum comportamento existente é alterado**.

## Testes

```bash
cd backend
npm run test:event-pipeline
```

Cobre envelope/validação, processor (anonimização + filtro + summary 500), resiliência
(retry/fallback/non-retriable), orchestrator (4 rotas) e system health.
