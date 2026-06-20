# M1.20 — Remaining Enterprise Readiness Certification

**Data:** 2026-06-28  
**Pré-requisitos:** M1.17 · M1.18 · M1.19  
**Modo:** READ + IMPLEMENTAÇÃO CONTROLADA  
**Veredicto:** `ENTERPRISE_CORE_COMPLETE`

---

## Resumo executivo

Dos **8 módulos remanescentes**, **nenhum foi promovido** para Enterprise Ready nesta fase. A plataforma mantém **7 módulos Enterprise Ready** (M1.19) e o **core enterprise está completo**. Os bloqueadores são predominantemente **operacionais (adopção ESG)** e **maturidade foundation**, não falhas arquitecturais críticas nos runtimes.

**Remediação implementada (controlada):** Workflow BPMN recebeu `workflowPermissionGate` + flags `CAPABILITY_MATRIX` + `PERMISSION_ENFORCE` — arquitectura corrigida, mas **promoção negada** por `operational_readiness: false` (0 instâncias piloto).

---

## Etapa 1 — ESG Enterprise Certification

### Evidência Fresh Fit `511f4819` (2026-06-28, runtime real)

| Sinal | Valor | Interpretação |
|-------|-------|---------------|
| `telemetry_timeseries_v1` (environment) | **3.112** | Pipeline OT activo pós-M1.19 routing |
| `ai_interaction_traces` (ESG/environment) | **0** | Zero utilização cognitiva tenant-scoped |
| `industrial_operational_events` (environment) | **0** | Zero eventos operacionais adoptados |
| `audit_logs` (environment) | **0** | Zero acções utilizador auditadas |
| M1.17 `adoption_verdict` | **PILOT_ADOPTION_PENDING** | `environment_adoption_confirmed: false` |

```json
{
  "environment_architecture_ready": true,
  "environment_operational_adoption_ready": false,
  "environment_governance_ready": true,
  "blocking_type": "operational_adoption_gap_not_architectural"
}
```

**Conclusão ESG:** Runtimes ON (`IMPETUS_ENVIRONMENT_*_RUNTIME_ENABLED=true`), rotas `/api/environment-*` operacionais, RBAC/MFA/RLS enterprise (M1.19), Truth 100%. A ausência de adopção é **operacional** — equipa piloto não activou workspace Ambiental/ESG — **não** bloqueio arquitectural.

### Módulos ESG — não promovidos

| Módulo | Classificação mantida | Motivo |
|--------|----------------------|--------|
| Environment Operational | Em Consolidação / Pilot Ready | Adopção não confirmada |
| Environment Governance | Pilot Ready | Adopção não confirmada |
| Environment Executive | Em Consolidação | Adopção + audience preview |
| Cockpits ESG | Em Consolidação | Zero traces ESG tenant-scoped |

---

## Etapa 2 — Workflow BPMN Enterprise Validation

### Implementação M1.20

| Componente | Estado |
|------------|--------|
| `workflowEngine/permission/workflowPermissionGate.js` | ✅ Criado |
| `workflowOrchestrator.startWorkflow` | ✅ Gate integrado |
| `routes/workflowEngine.js` | ✅ Gate na rota `/instances/start` |
| `IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED` | `true` |
| `IMPETUS_WORKFLOW_PERMISSION_ENFORCE` | `true` |

```json
{
  "workflow_permission_enforced": true,
  "workflow_rbac_enforced": true,
  "workflow_multi_tenant_safe": true
}
```

### Gates de promoção

| Gate | Resultado |
|------|-----------|
| security | ✅ |
| truth | ✅ |
| auditability | ✅ |
| resilience | ✅ |
| multi_tenant | ✅ |
| **operational_readiness** | ❌ (0 `industrial_workflow_instances` no tenant piloto) |

**Workflow BPMN — não promovido.** Plataforma pronta; falta adopção operacional real (instâncias BPMN no piloto).

---

## Etapa 3 — Foundation Maturity Audit

```json
{
  "foundation_status": [
    {
      "module": "MES Foundation",
      "classification": "FOUNDATION",
      "evidence": "6 tabelas, /api/mes/health, backbone events, sem worker dedicado, 0 ordens piloto"
    },
    {
      "module": "Analytics Foundation",
      "classification": "FOUNDATION",
      "evidence": "4 tabelas, observability in-memory, sem async workers, 0 snapshots piloto"
    },
    {
      "module": "Logistics Foundation",
      "classification": "FOUNDATION",
      "evidence": "4 tabelas, observability in-memory, sem testes carga, 0 inventário piloto"
    }
  ]
}
```

Nenhum foundation qualifica para `PILOT_READY` ou `ENTERPRISE_READY` — scaffolding correcto, maturidade operacional insuficiente.

---

## Etapa 4 — Enterprise Promotion Gates

**Promovidos M1.20:** nenhum.

| Módulo | security | truth | audit | resilience | multi_tenant | operational | Promovido |
|--------|----------|-------|-------|------------|--------------|-------------|-----------|
| ESG (×4) | ✅ | ✅ | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Workflow BPMN | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Foundation (×3) | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ |

---

## Critério final

```json
{
  "phase": "M1.20",
  "pass": true,
  "verdict": "ENTERPRISE_CORE_COMPLETE",
  "enterprise_modules_promoted": [],
  "modules_remaining_foundation": [
    "Environment Operational",
    "Environment Governance",
    "Environment Executive",
    "Cockpits ESG",
    "Workflow BPMN",
    "MES Foundation",
    "Analytics Foundation",
    "Logistics Foundation"
  ],
  "enterprise_readiness_global": "core_complete",
  "enterprise_ready_total": 7,
  "summary": {
    "esg_blocker": "operational_adoption_gap_not_architectural",
    "workflow_blocker": "zero_pilot_workflow_instances",
    "foundation_blocker": "scaffolding_without_operational_maturity"
  }
}
```

---

## Cenário aplicável

**Cenário B — `ENTERPRISE_CORE_COMPLETE`**

Core Enterprise (7 módulos M1.19) completo. Módulos Foundation e ESG permanecem correctamente classificados até adopção operacional ou evolução M2.

---

## APIs

```
GET /api/m1/enterprise-remaining/status
GET /api/m1/enterprise-remaining/esg
GET /api/m1/enterprise-remaining/workflow
GET /api/m1/enterprise-remaining/foundation
```

---

## Próximas fases recomendadas (não executadas)

1. **Adopção ESG** — onboarding operacional Fresh Fit (desbloqueia 4 módulos ESG)
2. **M2 MES Operational** — evolução MES Foundation → operacional
3. **Workflow piloto** — criar instâncias BPMN reais no tenant piloto → re-certificar Workflow

---

## Artefactos

| Tipo | Path |
|------|------|
| Serviço | `m1EnterpriseRemainingCertificationService.js` |
| Rotas | `m1EnterpriseRemainingRoutes.js` |
| Workflow gate | `workflowEngine/permission/workflowPermissionGate.js` |
| Teste | `tests/m1/M1_20EnterpriseRemainingCertification.test.js` |
