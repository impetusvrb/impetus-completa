# AIOI_SLA_ENGINE_SPECIFICATION

**Fase:** AIOI-ORG-5 — Workflow & SLA Readiness  
**Data:** 2026-06-10  
**Implementação:** `backend/src/services/aioi/aioiSlaEngineService.js`

---

## 1. Declaração

Camada formal de SLA — **apenas cálculo determinístico**. Sem automação. Sem execução. Sem workflow runtime.

---

## 2. Campos SLA

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sla_class` | ENUM | Classe de prazo SLA |
| `due_at` | TIMESTAMPTZ | Data/hora limite calculada |
| `aging_hours` | NUMERIC | Horas desde `created_at` |
| `breach_state` | ENUM | Estado de cumprimento |
| `escalation_level` | ENUM | Nível de escalação (sem ação automática) |

---

## 3. Classes SLA

| sla_class | Prazo (horas) | priority_band origem |
|-----------|---------------|---------------------|
| `CRITICAL_4H` | 4 | critical |
| `HIGH_8H` | 8 | high |
| `MEDIUM_24H` | 24 | medium |
| `LOW_72H` | 72 | low |

---

## 4. Funções Canónicas

### 4.1 `calculateDueDate(slaClass, createdAt)`

```
due_at = created_at + SLA_CLASS_HOURS[slaClass]
```

### 4.2 `calculateAging(createdAt, referenceDate)`

```
aging_hours = (referenceDate - created_at) / 3600000
```

### 4.3 `detectBreach(agingHours, slaClass)`

| Condição | breach_state |
|----------|--------------|
| aging < 75% do prazo | `ON_TRACK` |
| aging 75%–100% do prazo | `AT_RISK` |
| aging > 100% do prazo | `BREACHED` |

### 4.4 `detectEscalation(breachState, priorityBand)`

| breach_state | priority_band | escalation_level |
|--------------|---------------|------------------|
| ON_TRACK | * | LEVEL_0 |
| AT_RISK | critical/high | LEVEL_1 |
| AT_RISK | medium/low | LEVEL_0 |
| BREACHED | critical | LEVEL_3 |
| BREACHED | high | LEVEL_2 |
| BREACHED | medium/low | LEVEL_1 |

**Nota:** Escalation é apenas classificação — nenhuma ação automática é executada.

---

## 5. Estados Permitidos

**breach_state:** `ON_TRACK` | `AT_RISK` | `BREACHED`

**escalation_level:** `LEVEL_0` | `LEVEL_1` | `LEVEL_2` | `LEVEL_3`

---

## 6. Persistência

Colunas adicionadas via `migrations/aioi_org5_workflow_sla_migration.sql`:
- `industrial_operational_events.sla_class`
- `industrial_operational_events.due_at`
- `industrial_operational_events.aging_hours`
- `industrial_operational_events.breach_state`

`escalation_level` reutiliza coluna existente `escalation_level` (SMALLINT 0–3).

---

## 7. Proibições

- Sem LLM na determinação de SLA
- Sem execução automática por breach
- Sem alteração de `operationalPrioritizationService`
- Sem alteração de Truth enforcement

---

*AIOI_SLA_ENGINE_SPECIFICATION — ORG-5.*
