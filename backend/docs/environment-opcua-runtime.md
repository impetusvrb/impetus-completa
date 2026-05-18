# Environment OPC-UA Runtime (shadow)

## Módulo

`connectors/environmentOpcUaConnector.js`

## Comportamento

- Subscrições simuladas por `node_id`
- Normalização para amostra ambiental (`telemetry_source: opcua`)
- Reconnect simulado — evento `environment.telemetry.reconnect_completed` via orchestrator

## Flag

`IMPETUS_ENVIRONMENT_TELEMETRY_OPCUA_ENABLED`

## API

`POST /api/environment-telemetry/connectors/opcua/ingest`
