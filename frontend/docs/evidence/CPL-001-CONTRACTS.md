# CPL-001 — Cognitive Contracts

**Programa:** CPL-001  
**Fonte canónica:** `frontend/src/platform/cognitive/contracts/cognitiveContractDescriptors.js`  
**Status:** Interfaces apenas — **sem implementação**

---

## Princípio

Contratos corporativos definem a **forma pública futura** da Cognitive Platform. Implementações actuais permanecem nos domínios respectivos.

---

## Contratos definidos

| Contract ID | Métodos | Implementações referenciadas |
|-------------|---------|------------------------------|
| `RecommendationProvider` | listRecommendations, getRecommendation | OPM-008, OPM-007, Quality, Safety, Environment, adaptive, learning, DecisionEnginePanel |
| `DecisionTraceProvider` | buildTrace, buildInsightTrace | clDecisionTrace, wiRecommendationUtils, WidgetInsightsIA, ReasoningWorkspace, CauseEffectChain |
| `ScenarioProvider` | listScenarios, runScenario | clScenarioUtils, CentroPrevisao, PredictionCenterWidget, DigitalTwinPanel |
| `RiskProvider` | computeRiskScore, computeHealthScore | clKpiUtils, wiKpiUtils, CognitiveQualityHub, SafetyPressure, EnvironmentRisk |
| `InsightProvider` | generateInsights, listInsights | clPredictiveUtils, wiBottleneckUtils, QualityPredictive, EmergentInsights, StrategicPredictions |
| `TimelineProvider` | buildTimeline, filterTimeline | clTimelineUtils, wiTimelineUtils, IndustrialTimeline, CognitiveTimelineLive |
| `HeuristicProvider` | listRules, getRule, evaluateRule | clHeuristicRules, dashboardSurfaceCapabilities, safeMinimalPolicy |
| `ConfidenceProvider` | scoreConfidence | clHeuristicRules, clPredictiveUtils, WidgetInsightsIA, QualityDriftPanel |
| `CognitiveObservabilityProvider` | track, listEvents | clObservability, wiObservability, wmsUiObservability, eoxObservability, smartPanelEvents |
| `GapRegistryProvider` | listGaps | 8 gap registries WMS + CL/WI |

---

## Shapes de dados (referência)

### CognitiveRecommendation

- `id`, `priority`, `confidence` (0..1), `impact`, `title`, `message`
- `action`: `advisory` | `predictive_advisory` | `informativo`
- `evidence[]`, `modulesInvolved[]`

### CognitiveDecisionTrace

```
Recommendation → Evidence → Metrics → Events → Contracts
```

### CognitiveScenarioResult

- `baseline`, `projected`, `impacts[]`
- **`sideEffects: false`** (obrigatório)
- **`advisory: true`**

---

## Import canónico

```javascript
import { getCognitiveContract, COGNITIVE_CONTRACT_IDS } from 'platform/cognitive';
```

---

## Proibido em CPL-001

- Implementar classes/providers que satisfaçam estes contratos
- Mover código existente para `platform/cognitive/`
- Criar engines paralelos

Implementação prevista: **CPL-002** (Shared Decision Engine) via adapters.
