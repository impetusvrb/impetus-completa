# ARCH-PLAN-001 — Reuse Analysis

**Fase:** ARCH-PLAN-001  
**Baseline:** ENT-001 catalogs  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/planning/archPlan001ReuseAnalysis.js`

---

## Princípio

Estimar reaproveitamento **antes** de abrir qualquer programa de implementação. Fontes: module, runtime, cognitive e integration catalogs ENT-001.

---

## Top reaproveitamento

| Domínio | Reuse % | Componentes | Runtimes | Cognitive |
|---------|---------|-------------|----------|-----------|
| finance | ~100 | 5+ módulos FIN-AUD | leakage, costs, Nexus | smart_panel |
| logistics_wms | ~100 | 9 módulos WMS | wms_baseline, adapters | 8+ capabilities |
| command_center | ~70 | widgets CC | operational_brain | smart_panel |
| quality | ~34 | EOX views | quality_adapter | cognitive hub |
| cognitive_center | ~30 | — | orchestrator | governance |

---

## Finance — inventário reutilizável (FIN-AUD)

### Componentes
- CentroCustosExecutivo / Admin
- MapaVazamentoFinanceiro
- Widgets CC (custos, vazamentos, margem)
- NexusIACustos

### Runtimes
- industrialCostService
- financialLeakageDetectorService (REG-002 R1)
- nexus_billing_engine_v4
- cognitive_budget_runtime

### Contratos activos
- dashboard.costs
- dashboard.financialLeakage (recovered)
- nexusWallet.admin
- VIEW_FINANCIAL RBAC
- contextualModules finance category

### Proibido recriar
Leakage detector, industrial costs API, Nexus billing — **integrar**.

---

## Recover candidates — cockpits existentes

| Domínio | Asset reutilizável |
|---------|-------------------|
| ppap | PpapNativeCockpitPromotion |
| msa | MsaNativeCockpitPromotion |
| ishikawa | IshikawaNativeCockpitPromotion + qualityGovernanceUiEngine |
| supply | supplyWorkspaceRegistry + OPM-008 handoff |

---

## Greenfield — reuse mínimo

| Domínio | Reuse % | Notas |
|---------|---------|-------|
| hr | 0 | Ausente baseline |
| maintenance | ~5 | Padrões operational apenas |
| production | ~10 | industrial_operational_map, MES refs |

---

## Consulta

```javascript
import { getReuseAnalysisReport, listDomainsByReuse } from '../src/platform/planning/index.js';
```
