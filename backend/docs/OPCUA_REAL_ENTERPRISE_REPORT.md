# OPC-UA Real Runtime — Relatório PROMPT 20

**Data:** 2026-05-27  
**Roadmap:** D9 · Conectores industriais reais · Telemetria ambiente  
**Estado:** `IMPETUS_OPCUA_REAL_MODE=audit` — sessão real + subscrições; ingest **não** persiste por defeito

---

## 1. Objetivo

Substituir o conector OPC-UA simulado por runtime real (`node-opcua`) com:

- Sessão + subscrições monitorizadas (sampling interval, QoS de publicação)
- Reconnect e replay de amostras em buffer
- Ponte DLQ (`industrial_event_dlq`)
- Modos shadow / audit / on com piloto por tenant
- Fallback: `simulateReconnect()` / `simulateDisconnect()` preservados

---

## 2. Modos

| Modo | Liga ao servidor | Persiste ingest | Uso |
|------|------------------|-----------------|-----|
| `off` | Não | Não | Rollback |
| `shadow` | Não | Não | Simulação legada |
| `audit` | **Sim** | Só se `IMPETUS_OPCUA_REAL_AUDIT_PERSIST=true` | Piloto actual |
| `on` | Sim | **Sim** | Promoção pós-validação |

Modo efectivo = `min(global, tenant_opcua_servers.mode)`.

---

## 3. Componentes

| Área | Path |
|------|------|
| Flags | `src/industrial-opcua/config/opcuaRealFlags.js` |
| Governança | `src/industrial-opcua/governance/opcuaGovernanceService.js` |
| Cliente runtime | `src/industrial-opcua/runtime/opcuaRealClientRuntime.js` |
| Buffer/replay | `src/industrial-opcua/runtime/opcuaSampleBufferRuntime.js` |
| DLQ | `src/industrial-opcua/runtime/opcuaDlqBridge.js` |
| Config servidor | `src/industrial-opcua/services/opcuaServerConfigService.js` |
| Bridge legado | `domains/environment/telemetry/connectors/environmentOpcUaConnector.js` |
| Schema | `src/models/industrial_opcua_migration.sql` |

Tabelas: `tenant_opcua_servers`, `opcua_sample_buffer`, `opcua_connection_audit`.

Dependência: `node-opcua` (^2.x).

---

## 4. Flags (piloto)

```env
IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_TELEMETRY_OPCUA_ENABLED=true
IMPETUS_OPCUA_REAL_ENABLED=true
IMPETUS_OPCUA_REAL_MODE=audit
IMPETUS_OPCUA_REAL_PILOT_ONLY=true
IMPETUS_OPCUA_REAL_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3
IMPETUS_OPCUA_ENDPOINT_URL=opc.tcp://127.0.0.1:4840
IMPETUS_OPCUA_RECONNECT_MS=5000
IMPETUS_OPCUA_BUFFER_MAX=5000
IMPETUS_OPCUA_REAL_AUDIT_PERSIST=false
```

**Rollback:**

```bash
IMPETUS_OPCUA_REAL_ENABLED=false
IMPETUS_OPCUA_REAL_MODE=shadow
pm2 restart impetus-backend --update-env
```

---

## 5. Admin / API

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/admin/runtime-flags/opcua-real` | Diagnósticos + stats |
| `GET/POST .../opcua-real/servers` | Config por tenant |
| `POST .../opcua-real/reconnect` | Reconnect sessão |
| `GET .../opcua-real/audit` | Eventos de audit |
| `POST /api/environment-telemetry/connectors/reconnect` | MQTT + OPC-UA unificado |

Boot PM2: `[OPCUA_REAL_BOOT]`.

Se não houver servidor OPC-UA em `4840`, o boot regista `CONNECT_FAILED` em audit — comportamento seguro (não bloqueia o processo).

---

## 6. Validação

```bash
cd backend
node tests/industrial-opcua/runOpcUaRealTests.js
node scripts/verify-opcua-real-evidence.js
node scripts/apply-opcua-real-pilot.js
pm2 logs impetus-backend --lines 80 | grep OPCUA_REAL
```

Lab: Prosys OPC UA Simulation Server ou `opc.tcp://127.0.0.1:4840` com nós `ns=2;s=Simulator1`.

---

## 7. Próximo passo

**PROMPT 21 — Modbus Real** — ver `MODBUS_REAL_ENTERPRISE_REPORT.md`.
