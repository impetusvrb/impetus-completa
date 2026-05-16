# WAVE 1 — Plano Técnico: Backbone Industrial de Eventos

> Entrega aditiva, shadow-first, flag-gated. **Não** substitui `envelope.js` v2, `auditOutboxService`, nem `cognitiveEventBackboneService`.

## 1. Objetivo

Transformar o `eventPipeline` num backbone preparado para módulos industriais (Qualidade, SST, Ambiental, Logística) sem alterar o comportamento actual em produção.

## 2. Componentes entregues

| Módulo | Caminho | Função |
|--------|---------|--------|
| Flags | `eventPipeline/industrialFlags.js` | Defaults seguros |
| Catálogo | `eventPipeline/catalog/industrialEventCatalog.js` | `<domain>.<entity>.<verb>` |
| Envelope | `eventPipeline/industrialEnvelope.js` | correlation, causation, trace, workflow, idempotency |
| Outbox | `eventPipeline/outbox/industrialOutboxService.js` | Multi-domínio + retry |
| DLQ | `eventPipeline/dlq/industrialDlqService.js` | Falhas permanentes |
| Replay | `eventPipeline/replay/shadowReplayWorker.js` | Shadow sem efeitos laterais |
| Throttle | `eventPipeline/throttling/tenantThrottleService.js` | Observe-first por tenant |
| Hooks | `eventPipeline/summarization/summarizationHooks.js` | Estrutura Wave 4 |
| Orquestrador | `eventPipeline/industrialEventBackbone.js` | API `publishIndustrialEvent` |

## 3. Flags (defaults)

| Flag | Default |
|------|---------|
| `IMPETUS_INDUSTRIAL_EVENTS_ENABLED` | `false` |
| `IMPETUS_INDUSTRIAL_OUTBOX_ENABLED` | `false` |
| `IMPETUS_INDUSTRIAL_DLQ_ENABLED` | `false` |
| `IMPETUS_INDUSTRIAL_REPLAY_SHADOW` | `true` |
| `IMPETUS_EVENT_CATALOG_STRICT` | `false` |
| `IMPETUS_EVENT_THROTTLE_PER_TENANT` | `false` |

## 4. Modelo de dados

Migration: `migrations/industrial_event_backbone_migration.sql`

- `industrial_event_outbox` — fila durável com `idempotency_key` UNIQUE
- `industrial_event_dlq` — dead letters
- `industrial_event_replay_log` — auditoria de runs shadow

## 5. Integração

- `pipeline.js`: `mirrorLegacyEventToIndustrial` após processamento (não bloqueia)
- `featureGovernanceService`: flags + regra summarizer sem events
- `GET /api/internal/industrial-event-backbone/health`

## 6. Rollout recomendado

1. Deploy com todas as flags `false` (código inerte).
2. `IMPETUS_INDUSTRIAL_EVENTS_ENABLED=true` em staging — mirror only.
3. `IMPETUS_INDUSTRIAL_OUTBOX_ENABLED=true` — dual-write outbox.
4. Após 7 dias estáveis: `IMPETUS_INDUSTRIAL_DLQ_ENABLED=true`.
5. Replay shadow contínuo; promoção W2 quando divergência < 0,1%.

## 7. Rollback

Desligar flags → runtime legado inalterado. Tabelas permanecem vazias/inertes.

## 8. Gate W1→W2

- ≥ 80% eventos espelhados em outbox (métrica operacional)
- Divergência replay shadow < 0,1% / 7 dias
- Sem regressão nos testes enterprise existentes

## 9. Fora de scope (WAVE 1)

- Kafka, microsserviços, módulos `domains/*`
- Authority promotion do pipeline
- Alterações frontend/CSS
