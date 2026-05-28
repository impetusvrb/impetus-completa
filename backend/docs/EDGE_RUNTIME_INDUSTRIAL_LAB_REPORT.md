# Edge Runtime + Lab Industrial E2E — Relatório PROMPT 22

**Data:** 2026-05-27  
**Roadmap:** D9 · D10 · T2.6 lab industrial  
**Estado:** Edge persistente + lab E2E; **MQTT e Edge promovidos para `on`**

---

## 1. Objetivo

- Fila edge **persistente** (PostgreSQL) além da fila em memória legada
- Bridge edge → MQTT / OPC-UA / Modbus (normalização + ingest em modo `on`)
- Suite lab E2E com registo em `industrial_lab_runs`
- Docker compose para Mosquitto + Modbus simulator
- Promoção piloto **audit → on** (MQTT + Edge)

---

## 2. Componentes

| Área | Path |
|------|------|
| Flags | `src/industrial-edge/config/edgeRuntimeFlags.js` |
| Governança | `src/industrial-edge/governance/edgeGovernanceService.js` |
| Fila persistente | `src/industrial-edge/services/edgeQueuePersistenceService.js` |
| Bridge conectores | `src/industrial-edge/runtime/edgeConnectorBridgeRuntime.js` |
| Sync | `src/industrial-edge/runtime/edgeRealSyncRuntime.js` |
| Lab E2E | `src/industrial-edge/lab/industrialLabE2eService.js` |
| Orchestrator | `environmentTelemetryOrchestrator.js` (enqueue/sync unificado) |
| Lab infra | `infra/industrial-lab/docker-compose.yml` |

Tabelas: `edge_runtime_queue`, `edge_sync_audit`, `industrial_lab_runs`.

---

## 3. Flags

```env
IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED=true
IMPETUS_EDGE_RUNTIME_REAL_ENABLED=true
IMPETUS_EDGE_RUNTIME_MODE=on
IMPETUS_EDGE_RUNTIME_PERSIST_QUEUE=true
IMPETUS_INDUSTRIAL_LAB_ENABLED=true

IMPETUS_MQTT_REAL_MODE=on
IMPETUS_OPCUA_REAL_MODE=audit
IMPETUS_MODBUS_REAL_MODE=audit
```

**Rollback:**

```bash
IMPETUS_MQTT_REAL_MODE=audit
IMPETUS_EDGE_RUNTIME_MODE=audit
pm2 restart impetus-backend --update-env
```

**Promover OPC-UA/Modbus também:**

```bash
node scripts/promote-industrial-connectors-on.js --all
```

---

## 4. Admin / API

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/admin/runtime-flags/edge-runtime` | Diagnósticos |
| `GET .../edge-runtime/queue` | Memória + BD |
| `POST .../edge-runtime/sync` | Sync memória + persistente + bridge |
| `POST .../industrial-lab/e2e` | Executa suite lab |
| `GET .../industrial-lab/runs` | Histórico de runs |

Boot: `[EDGE_RUNTIME_BOOT]`.

---

## 5. Lab industrial (mesmo host — sem Docker)

| Serviço | Gestão | Endereço |
|---------|--------|----------|
| Mosquitto | `systemctl` (apt) | `127.0.0.1:1883` |
| Modbus TCP | PM2 `impetus-lab-modbus` | `127.0.0.1:502` |
| OPC-UA lab | PM2 `impetus-lab-opcua` | `127.0.0.1:4840/UA/ImpetusLab` |
| Agente edge | PM2 `impetus-edge-agent-lab` | → `http://127.0.0.1:4000` |

```bash
sudo apt install -y mosquitto mosquitto-clients
pip3 install pymodbus
cd backend
pm2 start ecosystem.industrial-lab.config.js
node scripts/register-pilot-edge-agent.js
node scripts/bootstrap-industrial-host-unified.js
pm2 save
```

Ficheiros gerados pelo lab: `.opcua-lab-nodes.json`, `.opcua-lab-endpoint.txt`

---

## 6. Matriz D9 pós-promoção

| Conector | Modo piloto | Persiste ingest |
|----------|-------------|-----------------|
| MQTT | **on** | Sim |
| Edge | **on** | Sim (via bridge / ingest) |
| OPC-UA | audit | Não (por defeito) |
| Modbus | audit | Não (por defeito) |

---

## 7. Próximo

- Hardware loop PLC (roadmap T2.6)
- Promoção OPC-UA/Modbus após simuladores estáveis
- Agente edge físico (`edge_agents` + `edgeIngestService`)
