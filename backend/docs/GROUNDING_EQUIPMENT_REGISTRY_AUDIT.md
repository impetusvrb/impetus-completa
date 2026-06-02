# Grounding — Equipment Registry Audit (Fase 38-A)

**Data:** 2026-06-01  
**Modo:** READ-ONLY  
**Tenant referência:** find fish alimentos (`21dd3cee-2efa-4936-908f-9ff1ba04e2a3`)

---

## Pergunta central

O equipamento existe **apenas** em `plc_collected_data` ou também no cadastro operacional MES?

---

## Resposta

| Camada | Existe? | Evidência |
|--------|---------|-----------|
| **plc_collected_data** | **Sim** | 4 `equipment_id` distintos; ingestão contínua |
| **machine_monitoring_config** | **Não** (tenant) | `COUNT = 0` |
| **production_line_machines** | **Não** | `COUNT = 0` |
| **assets** | **Não** | `COUNT = 0` |
| **manuia_machines** | Tabela ausente / 0 | — |
| **equipment_registry** (nome canónico) | **Não existe** como tabela dedicada | — |

**Conclusão:** para este tenant, **equipment_id é órfão do registo MES** — existe na telemetria, não no registry cognitivo.

---

## Mapa equipment_id → cadastro

| equipment_id | equipment_name (PLC) | machine_monitoring_config | production_line_machines | assets |
|--------------|----------------------|---------------------------|--------------------------|--------|
| LAB-EQ-001 | LAB-EQ-001 | — | — | — |
| EQ-001 | Compressor Principal | — | — | — |
| EQ-002 | Bomba Hidráulica | — | — | — |
| EQ-003 | Prensa 500T | — | — | — |

**Actividade recente (7d):** predominantemente `LAB-EQ-001` (`status=running`, `alarm_state=ok`, ~42k leituras).

---

## Cadeia canónica de resolução de máquinas (código)

`machineRepository.findMachinesByCompany(company_id)` consulta **por ordem**:

1. `machine_monitoring_config` (`machine_identifier`, `machine_name`, `line_name`)
2. `production_line_machines` + `production_lines`
3. `assets` (`active = true`)

**Não consulta:** `plc_collected_data.equipment_id`.

Ficheiro: `backend/src/repositories/machineRepository.js` (linhas 18–110).

---

## Edge Runtime (ligação física)

| Campo | Valor |
|-------|-------|
| Agente | `impetus-lab-edge-01` |
| Tabela | `edge_agents` (1 registo) |
| `raw_data.source` | `"edge"` |
| `raw_data.edge_id` | `impetus-lab-edge-01` |

A telemetria chega ao PLC store **sem** passar pelo registry de máquinas do MES.

---

## Tabelas inventariadas (schema público)

Relacionadas a equipamento/máquina com `company_id` ou equivalente:

| Tabela | Registos tenant | Nota |
|--------|-----------------|------|
| plc_collected_data | 730k+ global; 42k+/30d tenant | **Fonte real de telemetria** |
| machine_monitoring_config | 0 | Registry primário cognitivo |
| production_line_machines | 0 | Fallback registry |
| assets | 0 | Fallback registry |
| machine_operational_profiles | 3 (global) | Não substitui registry por tenant |
| edge_agents | 1 | Conectividade |

Tabelas `mqtt_*`, `modbus_*`, `opcua_*` **não existem** no PG desta instância; runtimes industriais activos via env (piloto).

---

## Diagrama de isolamento

```
Edge / MQTT / OPC / Modbus (runtime)
        ↓
plc_collected_data.equipment_id  ←── EXISTE (LAB-EQ-001, EQ-001…)
        ↓
        ✕  (sem bridge)
        ↓
machine_monitoring_config        ←── VAZIO
        ↓
findMachinesByCompany() → []
        ↓
classifyDataState() → tenant_empty
```

---

## Veredito 38-A

| Item | Classificação |
|------|---------------|
| Telemetria real | **VERIFIED** |
| Registry operacional alinhado | **NOT VERIFIED** |
| equipment_id órfão | **SIM** (crítico) |

**Impacto:** toda a cadeia cognitiva que depende de `machines[]` trata o tenant como vazio, apesar de PLC activo.
