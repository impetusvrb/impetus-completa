# Environment Telemetry Validation

## Módulo

`validation/environmentTelemetryRuntimeValidation.js`

## Pacotes

| Função | Escopo |
|--------|--------|
| `environmentTelemetryRuntimeValidation` | flags, normalização, catálogo, contrato |
| `environmentRealtimeValidation` | reconnect/replay/DLQ safe (declarativo shadow) |
| `environmentEdgeValidation` | ordering + idempotency |
| `environmentTelemetryPublicationValidation` | shadow_only, sem full rollout |
| `environmentTelemetryBehaviorValidation` | assistive_only, sem PLC write |
| `environmentTelemetryMaturityValidation` | estágio 3 shadow |

## API

`GET /api/environment-telemetry/validation/run` (sem exigir runtime ligado)

## Teste npm

`npm run test:environment-telemetry-validation`
