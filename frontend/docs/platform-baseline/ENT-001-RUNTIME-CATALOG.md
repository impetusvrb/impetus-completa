# ENT-001 — Runtime Catalog

**Fase:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001RuntimeCatalog.js`

---

## Resumo

**27 runtimes** consolidados de FIN-AUD-001, OPM/WMS, cognitiveRuntime e CPL adapters.

---

## Operacionais certificados

| runtimeId | Label | Maturidade | Domínio |
|-----------|-------|------------|---------|
| wms_enterprise_baseline | WMS Enterprise Baseline | certified | logistics_wms |
| opm_gov_lifecycle | OPM Governance Lifecycle | certified | logistics_wms |

Fases congeladas: OPM-001D → OPM-008, OPM-E2E-001, OPM-GOV-001, WMS-REF-001.

---

## Dashboard / platform (pós REG-002)

| runtimeId | Status | Serviço |
|-----------|--------|---------|
| financial_leakage_detector | active (R1) | financialLeakageDetectorService |
| industrial_operational_map | active (R2) | industrialOperationalMapService |
| operational_brain_engine | active (R5) | operationalBrainEngine |
| operational_forecasting | partial_mount | operationalForecastingService |

---

## Finance / billing (FIN-AUD)

| runtimeId | Maturidade | Notas |
|-----------|------------|-------|
| finance_native | placeholder | GREENFIELD — não implementado |
| accountingRuntime | n/a | Não encontrado |
| nexus_billing_engine_v4 | complete | Billing Nexus IA |
| cognitive_budget_runtime | complete | Budget IA (não ERP) |
| cognitive_economics | partial | Impacto económico operacional |

---

## Cognitive adapters (CPL-002)

| adapterId | Domínio | Status |
|-----------|---------|--------|
| logistics_adapter | logistics_wms | active |
| quality_adapter | quality | active |
| safety_adapter | safety | active |
| environment_adapter | environment | active |
| finance_adapter | finance | planned |
| command_center_adapter | command_center | planned |

---

## cognitiveRuntime

- `cognitive_runtime_orchestrator` — backend cognitiveRuntime/
- `specialized_cockpit_resolver` — PPAP/MSA/Ishikawa/Logistics cockpits
- `adaptive_orchestration` — adaptiveOrchestrationRuntime

---

## Consulta

```javascript
import { getRuntimeCatalog, getRuntimeEntry } from '../src/platform/knowledge/index.js';
getRuntimeEntry('wms_enterprise_baseline');
```
