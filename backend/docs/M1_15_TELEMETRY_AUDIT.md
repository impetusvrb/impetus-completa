# M1.15 — Telemetry Persistence Audit

**Data:** 2026-06-16  
**Tenant piloto:** Fresh & Fit `511f4819`

---

## Pergunta

`industrial_telemetry_samples = 0` — telemetria está:

- **A)** não chegando  
- **B)** chegando e descartando  
- **C)** chegando e não persistindo (tabela errada)  
- **D)** desligada por configuração  

---

## Resposta

**Primária: C + A (tenant)**

Telemetria **chega e persiste** em `telemetry_timeseries_v1` (~4,16M registos, domínio `environment`).  
`industrial_telemetry_samples` permanece **0** porque o routing configurado usa `primary=timeseries`.  
Para Fresh Fit especificamente: **A** — OT pilot lists apontam para tenant lab `21dd3cee`, não `511f4819`.

```json
{
  "classification": "C_table_routing_mismatch_with_tenant_A",
  "telemetry_diagnosis": "C",
  "root_cause_identified": true
}
```

---

## Contagens (2026-06-16)

| Tabela / origem | Global | Fresh Fit `511f4819` |
|-----------------|--------|----------------------|
| `industrial_telemetry_samples` | **0** | 0 |
| `telemetry_timeseries_v1` | **~4,16M** | 5 |
| `plc_collected_data` | **~862K** | 0 |
| `plc_collected_data` (lab 7d) | — | 21dd3cee: activo |

---

## Pipeline validado

| Camada | Estado | Evidência |
|--------|--------|-----------|
| MQTT | ON | `IMPETUS_MQTT_REAL_MODE=on` |
| OPC-UA | ON | `IMPETUS_OPCUA_REAL_MODE=on` |
| Modbus | ON | `IMPETUS_MODBUS_REAL_MODE=on` |
| Edge Runtime | ON | `IMPETUS_EDGE_RUNTIME_MODE=on` |
| Storage V3 | ON | `IMPETUS_STORAGE_V3_ENABLED=true` |
| Isolated ingest | ON | `IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED=true` |
| Persistence routing | **timeseries** | `IMPETUS_ENVIRONMENT_TELEMETRY_PRIMARY_TABLE=timeseries` |

**Serviço:** `environmentTelemetryIngestService.js` → `_persist()` → `ingestTimeseriesV1()` (default)

**Não é B (descartar):** 4M+ rows provam ingestão activa; `shouldPersistSample()` sampling não esvazia globalmente.

**Não é D (desligado):** flags ingest ON; tabela `industrial_telemetry_samples` existe mas **não é destino primário**.

---

## Gap tenant piloto

Listas OT pilot (MQTT/OPC-UA/Modbus/Edge):

```
IMPETUS_*_REAL_PILOT_TENANTS = 21dd3cee-2efa-4936-908f-9ff1ba04e2a3
```

Fresh Fit (`511f4819`) **ausente** — telemetria física concentrada no tenant lab.

Auditorias M1.11/M1.12 medem `industrial_telemetry_samples` tenant-scoped → **0** mesmo com pipeline global activo.

---

## Remediação (M1.16)

1. Alinhar métricas de audit à tabela primária (`telemetry_timeseries_v1`) ou activar dual-write
2. Incluir `511f4819` nas listas OT pilot quando sensores Fresh Fit estiverem ligados
3. Documentar distinção PLC (`plc_collected_data`) vs telemetria ambiental isolada (Wave 3)
