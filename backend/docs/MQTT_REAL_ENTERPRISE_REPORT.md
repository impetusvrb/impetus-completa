# MQTT Real Runtime — Relatório PROMPT 19

**Data:** 2026-05-27  
**Roadmap:** D9 · Conectores industriais reais · Telemetria ambiente  
**Estado:** `IMPETUS_MQTT_REAL_MODE=audit` — broker real + trace; ingest **não** persiste por defeito

---

## 1. Objetivo

Substituir o conector MQTT simulado (memória) por runtime real (`mqtt.js` v5) com:

- Reconnect automático e QoS configurável
- Buffer + replay após reconnect
- Ponte DLQ (`industrial_event_dlq` via `mqttDlqBridge`)
- Modos shadow / audit / on com piloto por tenant
- Fallback seguro: `simulateReconnect()` / `simulateDisconnect()` preservados

---

## 2. Modos

| Modo | Liga ao broker | Persiste ingest | Uso |
|------|----------------|-----------------|-----|
| `off` | Não | Não | Rollback |
| `shadow` | Não | Não | Registry + simulação legada |
| `audit` | **Sim** | Só se `IMPETUS_MQTT_REAL_AUDIT_PERSIST=true` | Piloto actual |
| `on` | Sim | **Sim** (pipeline telemetria) | Promoção pós-validação |

Modo efectivo = `min(global, broker.mode)` via `mqttGovernanceService.getEffectiveMode()`.

---

## 3. Componentes

| Área | Path |
|------|------|
| Flags | `src/industrial-mqtt/config/mqttRealFlags.js` |
| Governança | `src/industrial-mqtt/governance/mqttGovernanceService.js` |
| Cliente runtime | `src/industrial-mqtt/runtime/mqttRealClientRuntime.js` |
| Buffer/replay | `src/industrial-mqtt/runtime/mqttBufferReplayRuntime.js` |
| DLQ | `src/industrial-mqtt/runtime/mqttDlqBridge.js` |
| Config broker | `src/industrial-mqtt/services/mqttBrokerConfigService.js` |
| Bridge legado | `domains/environment/telemetry/connectors/environmentMqttConnector.js` |
| Schema | `src/models/industrial_mqtt_migration.sql` |

Tabelas: `tenant_mqtt_brokers`, `mqtt_message_buffer`, `mqtt_connection_audit`.

---

## 4. Flags (piloto)

```env
IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED=true
IMPETUS_MQTT_REAL_ENABLED=true
IMPETUS_MQTT_REAL_MODE=audit
IMPETUS_MQTT_REAL_PILOT_ONLY=true
IMPETUS_MQTT_REAL_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3
IMPETUS_MQTT_BROKER_URL=mqtt://127.0.0.1:1883
IMPETUS_MQTT_RECONNECT_MS=5000
IMPETUS_MQTT_BUFFER_MAX=5000
IMPETUS_MQTT_REAL_AUDIT_PERSIST=false
```

**Rollback instantâneo:**

```bash
IMPETUS_MQTT_REAL_ENABLED=false
IMPETUS_MQTT_REAL_MODE=shadow
pm2 restart impetus-backend --update-env
```

**Promoção `on` (após broker + ingest validados):**

```bash
IMPETUS_MQTT_REAL_MODE=on
# opcional por tenant em tenant_mqtt_brokers.mode
pm2 restart impetus-backend --update-env
```

---

## 5. Admin / API

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/admin/runtime-flags/mqtt-real` | Diagnósticos + stats globais |
| `GET /api/admin/runtime-flags/mqtt-real/brokers` | Config do tenant |
| `POST /api/admin/runtime-flags/mqtt-real/brokers` | Upsert config |
| `POST /api/admin/runtime-flags/mqtt-real/reconnect` | Reconnect broker |
| `GET /api/admin/runtime-flags/mqtt-real/audit` | Últimos eventos audit |
| `POST /api/environment/telemetry/connectors/reconnect` | Reconnect unificado (real ou simulação) |

Boot PM2: log `[MQTT_REAL_BOOT]` em `server.js`.

---

## 6. Validação

```bash
cd backend
node tests/industrial-mqtt/runMqttRealTests.js
node scripts/verify-mqtt-real-evidence.js
node scripts/apply-mqtt-real-pilot.js   # restart PM2 + verify
pm2 logs impetus-backend --lines 80 | grep MQTT_REAL
```

Com Mosquitto local: publicar em `plant/#` ou `environment/#` e confirmar entradas em `mqtt_connection_audit` (`message_audit`).

---

## 7. Observabilidade

- Traces: `mqttTracing.trace()` → `mqtt_connection_audit`
- Boot audit: `emitBootAudit()` no warm boot
- Métricas runtime: `getGlobalStats()` (received, persisted, buffered, dlq, reconnects)

---

## 8. Próximo passo

**PROMPT 20 — OPC-UA Real** — ver `OPCUA_REAL_ENTERPRISE_REPORT.md`.
