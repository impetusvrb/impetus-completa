# Environment Telemetry Runtime — Plano (Etapa 3)

## Objetivo

Transformar o domínio **ENVIRONMENT** num runtime ambiental industrial **realtime**, shadow-first, additive-only.

## Camadas

| Camada | Path |
|--------|------|
| Backend | `backend/src/domains/environment/telemetry/` |
| API | `/api/environment-telemetry` |
| Frontend | `frontend/src/domains/environment/telemetry-runtime/` |

## Flags (default: desligado)

- `IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED`
- `IMPETUS_ENVIRONMENT_TELEMETRY_BACKBONE_EVENTS_ENABLED`
- `IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED`
- `IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED` / `OPCUA` / `MODBUS`

Frontend espelho: `VITE_IMPETUS_ENVIRONMENT_TELEMETRY_*`

## Princípios

- Shadow-only — sem FULL rollout
- Assistive analytics — sem bloqueio de operação ou escrita em PLC
- WAVE 3 ingest isolado + eventos no `industrialEventCatalog`
- Replay-safe / idempotência via `idempotency_key` e fila edge ordenada

## Testes

`npm run test:environment-telemetry-runtime`
