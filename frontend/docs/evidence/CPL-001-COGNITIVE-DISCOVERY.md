# CPL-001 — Cognitive Discovery Catalog

**Programa:** CPL-001 — Cognitive Platform Layer  
**Método:** Varredura completa `frontend/src/`  
**Data:** 2026-07-19  
**Índice canónico:** `frontend/src/platform/cognitive/discovery/cognitiveDiscoveryIndex.js`

---

## Resumo executivo

Foram identificadas **~120 capacidades cognitivas/analíticas** distribuídas em **17 categorias** e **15+ domínios**. Nenhum código foi alterado nesta fase.

**Lacuna principal:** não existe *Insight Registry* centralizado — apenas *Gap Registries* (lacunas API/UX) e registos de cockpit/runtime.

---

## Categorias descobertas

| Categoria | Exemplos |
|-----------|----------|
| recommendation | OPM-008, Quality, Safety, Environment, Smart Panel, adaptive/learning adapters |
| decision_trace | clDecisionTrace, CauseEffectChain, EnvironmentReasoning, WidgetInsightsIA |
| scenario_simulation | clScenarioUtils, CentroPrevisao, DigitalTwin |
| risk_scoring | clKpiUtils, CognitiveQualityHub, SafetyPressure, EnvironmentRisk |
| confidence_scoring | clHeuristicRules, WidgetInsightsIA, QualityDrift |
| predictive_insights | clPredictiveUtils, wiBottleneckUtils, EmergentInsights |
| timeline | clTimelineUtils, wiTimelineUtils, CognitiveTimelineLive, IndustrialTimeline |
| heuristic_rules | clHeuristicRules, dashboardSurfaceCapabilities, safeMinimalPolicy |
| observability | clObservability, wiObservability, wmsUiObservability, eoxObservability |
| gap_registry | 8 módulos WMS + CL/WI gap registries |
| cockpit_runtime | cognitiveRuntime/foundation, domains/*, adaptive, learning |
| cognitive_hub | CognitiveQualityHub, SafetyCognitiveHub, CognitivePpapHub, Ishikawa, MSA |
| smart_panel | SmartPanel, Claude renderer, panelCommandProcessor |
| forecasting | CentroPrevisao, WidgetCentroPrevisao |
| executive_aioi | modules/aioi/* (foundation placeholders P8.x) |
| governance | OPM-GOV-001, CognitiveGovernanceDashboard, anamPanelGovernance |

---

## Domínios com capacidades cognitivas

### Logistics WMS (OPM-007 / OPM-008) — **Reference Stack**

Pipeline completo certificado:

```
WMS-003 APIs (read-only)
    ↓
OPM-007 Warehouse Intelligence (analítico)
    ↓
OPM-008 Cognitive Logistics (cognitivo)
```

Ficheiros: `modules/warehouse-intelligence/`, `modules/cognitive-logistics/`

### Quality

- `CognitiveQualityHub.jsx` + runtime signal adapter
- `QualityRecommendationPanel.jsx`, `QualityPredictiveInsights.jsx`, `QualityDriftPanel.jsx`
- `qualityGovernanceUiEngine.js` (manifesto FMEA, Ishikawa, SPC, Pareto)
- `qualityNativeCockpitRegistry.js`

### Safety

- `SafetyCognitiveHub.jsx`, `safetyCognitivePressureAnalyzer.js`
- `cognitiveRuntime/domains/sst/` (semantic + cockpit + density)

### Environment

- `EnvironmentCognitiveIntelligenceHub.jsx`, Reasoning/Recommendation/Risk workspaces
- `cognitiveRuntime/domains/environmental/`

### PPAP / Ishikawa / MSA

- `CognitivePpapHub.jsx`, `ishikawaHubs.jsx`, `CognitiveMsaHub.jsx`
- Registos nativos em `cognitiveRuntime/cockpit/`

### Command Center / Centro Cognitivo

- `features/dashboard/centroComando/cognitiveEcosystem/` (50+ painéis)
- DecisionEngine, EmergentInsights, Predictions, Organizational awareness
- `SmartPanel.jsx`, `DynamicClaudePanelRenderer.jsx`

### cognitiveRuntime (transversal)

- Foundation: multiDomainResolver, cockpitComposition, semanticIsolation
- Domains: production, maintenance, hr, executive, sst, environmental
- Adaptive orchestration + governance learning

### Forecasting

- `CentroPrevisaoOperacional.jsx` — projeções + simulação decisões

---

## Blocos mais reutilizáveis (prioridade CPL-002)

1. **OPM-007 + OPM-008 stack** — pipeline reference
2. **cognitiveRuntime/** — multi-domain cockpit foundation
3. **Smart Panel + Claude** — NL command + schema renderer
4. **Gap Registry + Observability pattern** — WMS modules
5. **Centro Cognitivo ecosystem** — composição avançada
6. **Domain hubs (Q/S/E)** — shell + adapter + API runInsights

---

## Entradas não operacionais (catalogadas, não migrar)

| Item | Estado |
|------|--------|
| AIOI executive runtimes | Foundation/placeholder |
| IndustrialInsightPanel | Stub reservado |
| APIs cognitivas dedicadas | GAP documentado — agregação client-side |

---

## Próximo passo

Ver `CPL-001-CAPABILITY-MATRIX.md` para matriz Capability × Domain × Reuse.
