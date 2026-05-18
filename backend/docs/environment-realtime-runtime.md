# Environment Realtime Telemetry Runtime

## Módulos

- `environmentRealtimeIngestionRuntime.js` — stream/batch realtime
- `environmentRealtimeCorrelationRuntime.js` — correlação por `correlation_id`
- `environmentTelemetryIngestService.js` — persistência WAVE 3

## API

- `POST /api/environment-telemetry/ingest/v1`
- `POST /api/environment-telemetry/ingest/dimensional`
- `POST /api/environment-telemetry/ingest/batch`
- `POST /api/environment-telemetry/ingest/realtime`

## Métricas observability

- `environment_realtime_ingestion_ms`
- `environment_realtime_queue_size`
- `environment_realtime_density_score`
