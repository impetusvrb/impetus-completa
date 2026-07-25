# ENT-001 — Cognitive Catalog

**Fase:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001CognitiveCatalog.js`

---

## Princípio

Reutilização **integral** do CPL — sem novos registries, adapters ou engines.

| Fonte CPL | Entradas base |
|-----------|---------------|
| COGNITIVE_PLATFORM_REGISTRY | 13 capabilities |
| COGNITIVE_DISCOVERY_CATALOG | 24 descobertas |
| COGNITIVE_ADAPTER_REGISTRY | 6 adapters |
| FIN-AUD cognitive audit | capacidades finance-adjacent |
| **Total consolidado** | **54** |

---

## Capabilities corporativas (CPL registry)

| capabilityId | Domínio owner | Adapter | Status adapter |
|--------------|---------------|---------|----------------|
| recommendation_engine | logistics_wms | logistics_adapter | active |
| decision_trace | logistics_wms | — | not_started |
| scenario_simulation | logistics_wms | logistics_adapter | active |
| heuristic_rules_engine | logistics_wms | — | not_started |
| explainability | command_center | — | not_started |
| risk_scoring | logistics_wms | — | not_started |
| confidence_scoring | logistics_wms | — | not_started |
| unified_timeline | logistics_wms | logistics_adapter | active |
| predictive_insights | logistics_wms | — | not_started |
| cognitive_observability | logistics_wms | — | not_started |
| gap_registry | platform | — | not_started |
| cockpit_runtime | platform | — | not_started |
| smart_panel | command_center | command_center_adapter | planned |

---

## Discovery por domínio (CPL-001)

- **logistics_wms:** warehouse_intelligence, cognitive_logistics (OPM-007/008)
- **quality:** cognitive hub, recommendations, governance UI
- **safety:** cognitive hub, risk analytics
- **environment:** cognitive runtime workspaces
- **command_center:** smart panel, cognitive ecosystem widgets
- **cognitiveRuntime:** adaptive, learning, economics adapters

---

## Governance (CPL-003)

Cada capability do registry possui entrada em lifecycle, ownership, versioning e compatibility. Consulta via `COGNITIVE_CAPABILITY_CATALOG`.

---

## Finance — auditoria cognitiva

FIN-AUD-001 regista capacidades economics/advisory adjacentes a Finance — **não** ERP contabilístico.

---

## Consulta

```javascript
import { getCognitiveCatalog, listCognitiveByDomain } from '../src/platform/knowledge/index.js';
listCognitiveByDomain('quality');
```
