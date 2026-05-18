# Environment MQTT Runtime (shadow)

## Módulo

`connectors/environmentMqttConnector.js`

## Comportamento

- Ingestão por tópico + payload JSON
- Buffer/reconnect em estado de processo (shadow)
- Latência registrada em `environment_mqtt_latency_ms`

## Flag

`IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED`

## API

`POST /api/environment-telemetry/connectors/mqtt/ingest`
