# SZ4 — Runtime Z Operational Nervous System

`Tipo: additive-only · shadow-first · HITL-first · rollback-safe · enterprise-safe`

## Objectivo

Fechar o ciclo operacional ponta-a-ponta: mensagem → pipeline unificado → continuidade → workflow → task persistente → lembrete → reintegração conversacional → follow-up → escalonamento assistivo → closure tracking.

## O que NÃO implementa

- IA autónoma
- Execução automática irreversível
- Autoenvio / autoescalonamento sem confirmação
- Biometria de voz activa

## Estrutura

```
backend/src/runtime-z-operational-nervous-system/
├── config/          # flags, governance, observation, HITL
├── _core/           # store, NLP, pipeline core
├── pipeline/        # unified operational pipeline
├── internal-chat/   # runtime chat interno + reintegração
├── tasks/           # cognitive task runtime
├── workflows/       # workflow persistence
├── reminders/       # lembretes contextuais
├── reintegration/   # continuidade de thread
├── awareness/       # silêncio, atraso, abandono
├── observation/     # observação selectiva governada
├── execution/       # HITL + assistive execution
├── communication/   # mensagens hierarchy-aware
├── intelligence/    # relevância operacional
├── observability/   # métricas SZ4
├── governance/      # human authority protection
├── shadow/          # shadow diff
├── resilience/      # fallback
└── facade/          # zOperationalNervousSystemFacade.js
```

## Stages (promoção manual)

| Stage | Significado |
|-------|-------------|
| `SZ4_SHADOW` (def.) | Observa, métricas, sem efeitos externos |
| `SZ4_OBSERVATION` | Observação contextual persistida |
| `SZ4_CONTINUITY_ACTIVE` | Continuidade de intent/workflow |
| `SZ4_TASK_RUNTIME_ACTIVE` | Tasks persistentes (HITL) |
| `SZ4_REINTEGRATION_ACTIVE` | Lembretes na thread original |
| `SZ4_OPERATIONAL_NERVOUS_SYSTEM` | Pipeline completo assistivo |

## API — `/api/runtime-z-operational-nervous-system/*`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Stage + invariantes |
| GET | `/continuity` | Continuidade operacional |
| GET | `/tasks` | Tasks persistentes |
| GET | `/workflows` | Workflows |
| GET | `/reminders` | Lembretes |
| GET | `/awareness` | Sinais de awareness |
| GET | `/observation` | Política de observação |
| GET | `/reintegration` | Estado reintegração |
| GET | `/governance` | Governança |
| GET | `/metrics` | Métricas SZ4 |
| POST | `/validate` | Validação humana (HITL) |
| POST | `/apply` | Processar mensagem pelo pipeline |

## Integrações

- `POST /api/internal-chat/.../messages` → `internalChatOperationalRuntime`
- `POST /api/chat/.../messages` → façade SZ4
- `reminderSchedulerService` → `contextualReminderRuntime.processDueReminders`
- `GET /dashboard/me` → bloco `runtime_z_operational_nervous_system`
- SZ2 / SZ3 upstream preservados

## Exemplo obrigatório

1. Carlos: «Preciso do relatório de perdas amanhã às 14h.»
2. Ana: «Ok, vou preparar.»
3. SZ4 detecta intent, prazo, owner, workflow, task, reminder.
4. No horário do lembrete (stage `SZ4_REINTEGRATION_ACTIVE`), mensagem contextual na thread original — **assistive/HITL**.

## Variáveis de ambiente

```
IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM=on
IMPETUS_SZ4_DEFAULT_STAGE=SZ4_SHADOW
IMPETUS_SZ4_PROMOTED_TENANTS=
IMPETUS_SZ4_PROMOTED_TENANT_STAGE=SZ4_OBSERVATION
IMPETUS_SZ4_PIPELINE=on
IMPETUS_SZ4_INTERNAL_CHAT=on
IMPETUS_SZ4_TASK_RUNTIME=on
IMPETUS_SZ4_REINTEGRATION=on
IMPETUS_SZ4_API=on
```

## Testes

```bash
npm run test:runtime-z-operational-nervous-system
```

## Rollback

- `IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM=off` → façade devolve `{ skipped: true }`
- Remover bloco SZ4 em `routes/dashboard.js` reverte `/dashboard/me`
- SZ1/SZ2/SZ3/Motor A/V2 intactos
