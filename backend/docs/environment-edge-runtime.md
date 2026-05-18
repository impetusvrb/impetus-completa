# Environment Edge Telemetry Runtime

## Módulo

`environmentEdgeTelemetryRuntime.js`

## Capacidades

- Fila por tenant em memória (shadow)
- `enqueueEdgeSample` com deduplicação por `idempotency_key`
- `syncEdgeQueue` com ordenação por `edge_sequence`
- Evento `environment.telemetry.edge_synced` (quando backbone ativo)

## API

- `GET /api/environment-telemetry/edge/queue`
- `POST /api/environment-telemetry/edge/enqueue`
- `POST /api/environment-telemetry/edge/sync`

## Flag

`IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED`
