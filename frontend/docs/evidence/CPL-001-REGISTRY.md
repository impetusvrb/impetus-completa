# CPL-001 — Cognitive Platform Registry

**Programa:** CPL-001  
**Fonte canónica:** `frontend/src/platform/cognitive/registry/cognitivePlatformRegistry.js`  
**Versão:** 1.0.0

---

## Propósito

Registry corporativo que **referencia** implementações cognitivas existentes. Não move código. Não duplica motores.

---

## Estrutura de entrada

```javascript
{
  capabilityId: 'recommendation_engine',
  label: 'Recommendation Engine',
  contractId: 'RecommendationProvider',
  ownerDomain: 'logistics_wms',
  canonicalImplementation: 'path/to/existing.js',
  alternateImplementations: ['...'],
  adapterId: 'logistics_adapter',
  adapterStatus: 'planned',
  reuse: 'required',
  migrateInCpl001: false  // always false in CPL-001
}
```

---

## Capacidades registadas (13)

1. recommendation_engine
2. decision_trace
3. scenario_simulation
4. heuristic_rules_engine
5. explainability
6. risk_scoring
7. confidence_scoring
8. unified_timeline
9. predictive_insights
10. cognitive_observability
11. gap_registry
12. cockpit_runtime
13. smart_panel

---

## WMS Enterprise Baseline

```javascript
WMS_ENTERPRISE_BASELINE = {
  status: 'complete',
  frozen: true,
  phases: ['OPM-001D' … 'OPM-008', 'OPM-E2E-001', 'OPM-GOV-001', 'WMS-REF-001']
}
```

---

## Validação

```javascript
import { validateCpl001RegistryIntegrity } from 'platform/cognitive';

const { valid, issues } = validateCpl001RegistryIntegrity();
// valid === true em CPL-001 certificado
```

---

## Import canónico

```javascript
import {
  getCognitiveCapability,
  getCognitiveAdapter,
  COGNITIVE_PLATFORM_REGISTRY,
  WMS_ENTERPRISE_BASELINE
} from 'platform/cognitive';
```

---

## Relação com discovery

| Artefacto | Papel |
|-----------|-------|
| `cognitiveDiscoveryIndex.js` | Inventário bruto (DISC-* entries) |
| `cognitivePlatformRegistry.js` | Matriz corporativa normalizada |
| `cognitiveContractDescriptors.js` | Interfaces futuras |

---

## Próximas fases

| Fase | Entrega |
|------|---------|
| CPL-002 | Shared Decision Engine + adapters logistics/quality/safety/environment |
| CPL-003 | Enterprise Cognitive Registry + adapters PPAP/Ishikawa/CC |
