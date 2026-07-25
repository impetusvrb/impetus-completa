# CPL-001 — Cognitive Capability Matrix

**Programa:** CPL-001  
**Fonte canónica:** `cognitivePlatformRegistry.js` + `cognitiveDiscoveryIndex.js`

---

## Matriz corporativa (capacidades × domínio)

| Capability | Domain (owner) | Canonical Implementation | Reuse | Service Candidate | Adapter |
|------------|----------------|--------------------------|-------|-------------------|---------|
| Recommendation Engine | logistics_wms | `clRecommendationEngine.js` | yes | yes | logistics_adapter (planned) |
| Decision Trace | logistics_wms | `clDecisionTrace.js` | yes | yes | — |
| Scenario Simulation | logistics_wms | `clScenarioUtils.js` | yes | yes | logistics_adapter (planned) |
| Heuristic Rules | logistics_wms | `clHeuristicRules.js` | yes | yes | — |
| Explainability | command_center | `WidgetInsightsIA.jsx` | yes | yes | command_center_adapter (planned) |
| Risk Scoring | logistics_wms | `clKpiUtils.js` | yes | yes | — |
| Confidence Scoring | logistics_wms | `clPredictiveUtils.js` | yes | yes | — |
| Unified Timeline | logistics_wms | `clTimelineUtils.js` | yes | yes | logistics_adapter (planned) |
| Predictive Insights | logistics_wms | `clPredictiveUtils.js` | yes | yes | — |
| Cognitive Observability | logistics_wms | `clObservability.js` | yes | yes | — |
| Gap Registry | platform | `clGapRegistry.js` (pattern) | yes | yes | — |
| Cockpit Runtime | platform | `multiDomainResolver.js` | yes | yes | — |
| Smart Panel | command_center | `SmartPanel.jsx` | yes | yes | command_center_adapter (planned) |

---

## Matriz por domínio (implementações alternativas)

| Capability | Quality | Safety | Environment | PPAP | Ishikawa | Maintenance |
|------------|---------|--------|-------------|------|----------|-------------|
| Recommendation | QualityRecommendationPanel | SafetyCognitiveHub | EnvironmentRecommendationWorkspace | — | — | maintenancePredictiveAdapter |
| Risk Score | CognitiveQualityHub | safetyCognitivePressureAnalyzer | EnvironmentCognitiveIntelligenceHub | — | — | maintenanceCockpitRuntime |
| Decision Trace | qualityGovernanceUiEngine | — | EnvironmentReasoningWorkspace | ishikawaHubs | ishikawaHubs | — |
| Cockpit Runtime | qualityNativeCockpitRegistry | safetyCockpitRuntime | environmentalCockpitRuntime | ppapNativeCockpitRegistry | ishikawaNativeCockpitRegistry | maintenanceCockpitRuntime |

---

## Dependências críticas

```
OPM-GOV-001 (contratos operacionais — congelado)
        ↓
WMS-003 APIs (dados — congelado)
        ↓
OPM-007 (inteligência analítica)
        ↓
OPM-008 (logística cognitiva — reference adapter target)
        ↓
CPL-002 Shared Decision Engine (futuro)
```

---

## Pode ser reutilizada?

| Resposta | Critério |
|----------|----------|
| **yes** | Implementação madura, padrão claro, testes ou certificação |
| **partial** | Hub/shell com lógica domínio acoplada |
| **future** | Foundation/placeholder (AIOI P8.x) |

---

## Pode virar serviço?

| Fase | Escopo |
|------|--------|
| CPL-002 | Recommendation, Decision Trace, Scenario (via logistics adapter) |
| CPL-003 | Enterprise registry + adapters Q/S/E/PPAP/Ishikawa/CC |

**CPL-001:** nenhuma consolidação de implementação — apenas registo.
