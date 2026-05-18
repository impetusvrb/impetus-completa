# Environment Modbus Runtime (shadow)

## Módulo

`connectors/environmentModbusConnector.js`

## Comportamento

- Polling de registos com retry (max 3)
- Conversão scale/offset para valor de telemetria
- Latência em `environment_modbus_latency_ms`

## Flag

`IMPETUS_ENVIRONMENT_TELEMETRY_MODBUS_ENABLED`

## API

`POST /api/environment-telemetry/connectors/modbus/ingest` — body `{ registers: [...], meta: {} }`
