# Modbus Real Runtime — Relatório PROMPT 21

**Data:** 2026-05-27  
**Roadmap:** D9 · Conectores industriais reais · Telemetria ambiente  
**Estado:** `IMPETUS_MODBUS_REAL_MODE=audit` — polling TCP real; ingest **não** persiste por defeito

---

## 1. Objetivo

Substituir o conector Modbus simulado (valores `raw_value` em memória) por runtime real (`modbus-serial` TCP) com:

- Polling periódico configurável (holding / input / coil / discrete)
- Retry, buffer + replay, ponte DLQ
- Modos shadow / audit / on com piloto por tenant
- Fallback: `simulateReconnect()` e poll simulado preservados

---

## 2. Modos

| Modo | Poll TCP real | Persiste ingest |
|------|---------------|-----------------|
| `off` | Não | Não |
| `shadow` | Não | Não |
| `audit` | **Sim** | Só se `IMPETUS_MODBUS_REAL_AUDIT_PERSIST=true` |
| `on` | Sim | **Sim** |

---

## 3. Componentes

| Área | Path |
|------|------|
| Flags | `src/industrial-modbus/config/modbusRealFlags.js` |
| Governança | `src/industrial-modbus/governance/modbusGovernanceService.js` |
| Runtime poll | `src/industrial-modbus/runtime/modbusRealPollRuntime.js` |
| Buffer/replay | `src/industrial-modbus/runtime/modbusSampleBufferRuntime.js` |
| DLQ | `src/industrial-modbus/runtime/modbusDlqBridge.js` |
| Config dispositivo | `src/industrial-modbus/services/modbusDeviceConfigService.js` |
| Bridge legado | `domains/environment/telemetry/connectors/environmentModbusConnector.js` |
| Schema | `src/models/industrial_modbus_migration.sql` |

Tabelas: `tenant_modbus_devices`, `modbus_sample_buffer`, `modbus_connection_audit`.

Dependência: `modbus-serial` (^8.x).

### Mapa de registos (`register_map`)

```json
[
  { "address": 0, "quantity": 2, "function": "holding", "scale": 0.1, "unit": "bar", "metric_key": "pressure.main" }
]
```

Funções: `holding`, `input`, `coil`, `discrete`.

---

## 4. Flags (piloto)

```env
IMPETUS_ENVIRONMENT_TELEMETRY_MODBUS_ENABLED=true
IMPETUS_MODBUS_REAL_ENABLED=true
IMPETUS_MODBUS_REAL_MODE=audit
IMPETUS_MODBUS_REAL_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3
IMPETUS_MODBUS_HOST=127.0.0.1
IMPETUS_MODBUS_PORT=502
IMPETUS_MODBUS_UNIT_ID=1
IMPETUS_MODBUS_POLL_MS=5000
IMPETUS_MODBUS_REAL_AUDIT_PERSIST=false
```

**Rollback:**

```bash
IMPETUS_MODBUS_REAL_ENABLED=false
IMPETUS_MODBUS_REAL_MODE=shadow
pm2 restart impetus-backend --update-env
```

---

## 5. Admin / API

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/admin/runtime-flags/modbus-real` | Diagnósticos + stats |
| `GET/POST .../modbus-real/devices` | Config por tenant |
| `POST .../modbus-real/reconnect` | Reinicia poller |
| `POST .../modbus-real/poll` | Poll manual |
| `GET .../modbus-real/audit` | Audit trail |
| `POST .../connectors/reconnect` | MQTT + OPC-UA + Modbus |

Boot PM2: `[MODBUS_REAL_BOOT]`.

Sem gateway em `:502`, o boot regista `POLL_FAILED` / `ECONNREFUSED` — não bloqueia o processo.

---

## 6. Validação

```bash
cd backend
node tests/industrial-modbus/runModbusRealTests.js
node scripts/verify-modbus-real-evidence.js
node scripts/apply-modbus-real-pilot.js
```

Lab: `docker run -p 502:502 oitc/modbus-server` ou simulador Modbus TCP local.

---

## 7. Trilha industrial (D9)

| Prompt | Protocolo | Estado |
|--------|-----------|--------|
| 19 | MQTT | audit piloto |
| 20 | OPC-UA | audit piloto |
| 21 | Modbus | audit piloto |

**Próximo:** Edge Runtime + lab — ver `EDGE_RUNTIME_INDUSTRIAL_LAB_REPORT.md`.
