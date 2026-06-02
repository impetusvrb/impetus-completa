# Real Factory Readiness Audit — Fase 37-A

**Data:** 2026-06-01  
**Modo:** READ-ONLY (inventário BD + env runtime, sem alteração de código)  
**Tenant piloto identificado:** `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` — **find fish alimentos**

---

## 1. Respostas executivas

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Existem dados industriais reais? | **Sim** — `plc_collected_data` com ingestão contínua |
| 2 | Existem tags reais? | **Sim** — colunas telemetria (`temperature`, `vibration`, `status`, `alarm_state`, etc.) por `equipment_id` |
| 3 | Existem snapshots reais? | **Parcial** — snapshot de software/PLC existe; interpretação cognitiva marca `tenant_empty` |
| 4 | Existem KPIs reais? | **Parcial** — séries PLC existem; KPIs derivados (OEE/MTBF) não ligados ao cadastro de máquinas MES |
| 5 | Existe ingest contínuo? | **Sim** — ~360 leituras/hora (últimas 24 h), último `collected_at` &lt; 15 s em auditoria |

---

## 2. Inventário por domínio

### PLC / Telemetria

| Item | Estado | Evidência |
|------|--------|-----------|
| Tabela `plc_collected_data` | Existe | **730 878** linhas totais |
| Tenant com dados 30d | 1 empresa | **42 114** linhas / 30d (find fish) |
| Equipamento | `LAB-EQ-001` | `equipment_id` + `equipment_name` |
| Origem ingest | Edge | `raw_data.source = "edge"`, `edge_id = impetus-lab-edge-01` |
| Tabelas `plc_devices` / `plc_tags` | Ausentes no schema | Inventário via colunas em `plc_collected_data` |

### MQTT

| Item | Estado |
|------|--------|
| Tabelas `mqtt_*` no PostgreSQL | **Não presentes** |
| Runtime `IMPETUS_MQTT_REAL_*` | **Activado** (piloto tenant find fish) |
| Persistência observada | Via pipeline → `plc_collected_data` (não tabela mqtt dedicada) |

### OPC-UA

| Item | Estado |
|------|--------|
| Tabelas `opcua_*` | **Não presentes** |
| Runtime `IMPETUS_OPCUA_REAL_*` | **Activado** (piloto) |
| Endpoint lab | `opc.tcp://127.0.0.1:4840/UA/ImpetusLab` (config env) |

### Modbus

| Item | Estado |
|------|--------|
| Tabelas `modbus_*` | **Não presentes** |
| Runtime `IMPETUS_MODBUS_REAL_*` | **Activado** (piloto) |

### Edge Runtime

| Item | Estado |
|------|--------|
| Tabela `edge_agents` | **1** agente |
| Agente | `impetus-lab-edge-01` — IMPETUS Lab Edge (same host) |
| `last_seen_at` | Atualizado em auditoria (ingest activo) |
| `edge_runtime_heartbeats` | Tabela não presente |

### Quality / Production / Safety / Environment / Maintenance

| Domínio | Tabela esperada | No schema PG |
|---------|-----------------|--------------|
| Quality (NC/CAPA) | `quality_non_conformities`, `quality_capa` | Não |
| Production | `production_orders`, `production_shifts` | Não |
| Safety | `safety_incidents` | Não |
| Environment | `environment_readings` | Não |
| Maintenance | `maintenance_work_orders` | Não |
| ManuIA máquinas | `manuia_machines` | Não |

**Conclusão:** backbone industrial **centrado em PLC+Edge**; módulos MES/qualidade ainda sem tabelas dedicadas nesta instância.

### Communications

| Item | Valor |
|------|-------|
| `communications` 30d (todos tenants) | **0** |

---

## 3. Amostra de telemetria real (evidência)

```
equipment_id: LAB-EQ-001
temperature: 10.00 | vibration: 2.20 | status: running | alarm_state: ok
collected_at: 2026-06-01T14:49:26Z (contínuo ~10s)
raw_data: { source: "edge", edge_id: "impetus-lab-edge-01" }
```

---

## 4. Lacuna de readiness (crítica para certificação)

Existe **desalinhamento semântico**:

- **BD:** dezenas de milhares de leituras PLC reais.
- **Interpretação IA (`data_state`):** `tenant_empty` — respostas referem «sem máquinas cadastradas».
- **Causa provável:** cadastro MES/`machines` não sincronizado com `equipment_id` PLC; snapshot operacional não promove telemetria a KPI conversacional.

Isto não invalida ingest real, mas impede classificar o tenant como **factory cognitivamente fechado**.

---

## 5. Script de auditoria

`node scripts/phase37-real-factory-audit.js` → JSON com inventário (ferramenta F37, read-only).

---

## 6. Veredito 37-A

| Classificação | **PARTIAL READY** |
|---------------|-------------------|
| Ingest industrial real | VERIFIED |
| Multi-protocolo (MQTT/OPC/Modbus) | RUNTIME ON / DB SCHEMA OFF |
| Domínios Quality/Production/etc. | NOT READY (sem tabelas) |
| Coerência snapshot ↔ IA | PARTIAL |

**Próximo passo recomendado:** alinhar cadastro de equipamentos ao `equipment_id` PLC antes de exigir respostas OEE/produção com números reais na IA.
