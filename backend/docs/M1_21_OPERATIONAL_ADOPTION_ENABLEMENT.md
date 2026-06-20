# M1.21 — Operational Adoption Enablement

**Data:** 2026-06-28  
**Pré-requisitos:** M1.17 · M1.18 · M1.19 · M1.20  
**Modo:** READ ONLY · Sem alterações arquitecturais  
**Veredicto:** `OPERATIONAL_ADOPTION_READY`

---

## Resumo executivo

A fase M1.21 elimina a **incerteza operacional** antes da entrada definitiva em M2. Não promove módulos, não gera dados artificiais e não altera RBAC, MFA, RLS ou Truth Program.

**Bloqueadores documentados (M1.20):**

| Bloqueador | Tipo | Resolução documentada |
|------------|------|----------------------|
| ESG | `operational_adoption_gap` | Path A — registo operacional via workspace |
| Workflow BPMN | `zero_pilot_workflow_instances` | `operational.task_lifecycle.v1` + `MODE=on` |
| Foundations | `lack_of_operational_data` | APIs HITL existentes — operação humana pendente |

**Alterações de plataforma:** 0 (architecture, security, truth, rbac)

---

## Etapa 1 — ESG Operational Enablement

### Módulos auditados

| Módulo | Runtime | API |
|--------|---------|-----|
| Environment Operational | ON | `/api/environment-operational` |
| Environment Governance | ON | `/api/environment-governance` |
| Environment Executive | ON | `/api/environment-executive` |
| Cockpits ESG | 7 ecrãs | `/app/environment/operational?view=*` |

### Como gerar os primeiros eventos ESG reais

**Path A (recomendado) — Registo operacional**

1. Autenticar no tenant Fresh & Fit (`511f4819`)
2. Abrir `/app/environment/operational?view=field`
3. Submeter registo via UI **ou** `POST /api/environment-operational/workspace/field/record`
4. Evento: `environment.field.occurrence_registered` → `industrial_operational_events`

**Áreas disponíveis:**

| Área | Evento gerado |
|------|---------------|
| water | `environment.water.sample_collected` |
| effluent | `environment.effluent.analysis_completed` |
| emissions | `environment.emission.alert_triggered` |
| waste | `environment.waste.manifest_created` |
| field | `environment.field.occurrence_registered` |

**Path B — Evento directo:** `POST /api/environment-operational/events`

**Path C — Telemetria OT:** `POST /api/environment-telemetry/ingest/v1` (pipeline activo; não substitui adopção M1.17)

**Path D — ESG/Governança:** `/app/environment/operational?view=esg` + `/api/environment-governance/*`

```json
{
  "environment_operational_journey_documented": true,
  "environment_event_generation_paths_identified": true,
  "esg_activation_requirements_mapped": true
}
```

---

## Etapa 2 — Workflow BPMN Activation Path

### Templates disponíveis

| process_key | Descrição |
|-----------|-----------|
| `governance.approval_chain.v1` | Cadeia de aprovação HITL |
| `operational.task_lifecycle.v1` | Ciclo open→assigned→done (**candidato 1.º**) |

### Como criar a primeira instância BPMN real

1. Confirmar `IMPETUS_WORKFLOW_ENGINE_MODE=on` (shadow = simulado, sem persistência)
2. `GET /api/workflow-engine/definitions`
3. `POST /api/workflow-engine/instances/start` com `{ "process_key": "operational.task_lifecycle.v1" }`
4. `POST /api/workflow-engine/instances/:id/signal` com `{ "event": "ASSIGN" }` ou `"COMPLETE"`
5. Verificar `industrial_workflow_instances` tenant-scoped

```json
{
  "workflow_templates_available": true,
  "workflow_activation_path_documented": true,
  "first_workflow_candidate_identified": true
}
```

---

## Etapa 3 — Foundation Operational Mapping

Classificação **FOUNDATION** preservada — sem promoção.

### MES Foundation

- **Tabelas:** `mes_production_orders`, `mes_production_executions`, `mes_downtime_events`, …
- **Primeira operação:** `POST /api/mes/production-orders` → `mes.production_order.created`

### Analytics Foundation

- **Tabelas:** `analytics_kpi_registry`, `analytics_aggregations`, …
- **Primeira operação:** `POST /api/analytics/kpis` → `analytics.kpi.generated`

### Logistics Foundation

- **Tabelas:** `logistics_inventory`, `logistics_receipts`, …
- **Primeira operação:** `POST /api/logistics/inventory` → `logistics.inventory.updated`

```json
{
  "mes_operational_gap_documented": true,
  "analytics_operational_gap_documented": true,
  "logistics_operational_gap_documented": true
}
```

---

## Etapa 4 — Adoption Readiness Score

```json
{
  "esg_activation_ready": true,
  "workflow_activation_ready": true,
  "foundation_activation_ready": true
}
```

---

## Critério final

```json
{
  "phase": "M1.21",
  "pass": true,
  "verdict": "OPERATIONAL_ADOPTION_READY",
  "architecture_changes": 0,
  "security_changes": 0,
  "truth_changes": 0,
  "rbac_changes": 0
}
```

---

## APIs

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/m1/operational-adoption-enablement/status` | Consolidação |
| `GET /api/m1/operational-adoption-enablement/esg` | Etapa 1 |
| `GET /api/m1/operational-adoption-enablement/workflow` | Etapa 2 |
| `GET /api/m1/operational-adoption-enablement/foundation` | Etapa 3 |
| `GET /api/m1/operational-adoption-enablement/readiness` | Etapa 4 |

Todas: `requireAuth` · READ ONLY
