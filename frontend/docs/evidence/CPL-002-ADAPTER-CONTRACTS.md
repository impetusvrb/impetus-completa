# CPL-002 — Adapter Contracts

**Programa:** CPL-002  
**Contratos base:** CPL-001 (`cognitiveContractDescriptors.js` — `interface_only`)  
**Versão registry:** 2.0.0

---

## Princípio

Os adapters **implementam tradução**, não contratos novos. Todos os contratos corporativos permanecem definidos no CPL-001 com status `interface_only`. O CPL-002 mapeia operações adapter → contrato existente.

---

## Mapeamento adapter → contratos

| Adapter | Contratos CPL-001 | Capabilities expostas |
|---------|-------------------|----------------------|
| `logistics_adapter` | RecommendationProvider, DecisionTraceProvider, ScenarioProvider, InsightProvider, RiskProvider, TimelineProvider, HeuristicProvider | insights, recommendations, simulation, trace, scenarios_catalog, health_kpi |
| `quality_adapter` | RecommendationProvider, InsightProvider, RiskProvider, DecisionTraceProvider | insights, recommendations, signals, runtime_context, health_endpoint |
| `safety_adapter` | RecommendationProvider, RiskProvider, InsightProvider | pressure_analysis, insights_endpoint, recommendations, health_endpoint |
| `environment_adapter` | RecommendationProvider, DecisionTraceProvider, RiskProvider, InsightProvider | insights_endpoint, recommendations, reasoning, health_endpoint |

---

## Padrão de delegação (thin adapter)

```
Application / Discovery API
        ↓
orchestrate(adapterId, operation, context)
        ↓
adapter.execute(operation, context)
        ↓
Domain provider (OPM-007/008, qualityCognitiveRuntimeSignalAdapter, etc.)
```

A inteligência permanece no domínio. O adapter:

1. Normaliza o `context` de entrada
2. Invoca função/API domínio existente
3. Devolve `{ ok, adapterId, operation, delegated: true, result }`

---

## Logistics — providers encapsulados

| Operação | Provider domínio |
|----------|------------------|
| `insights` | `clPredictiveUtils.computePredictiveInsights` |
| `recommendations` | `clRecommendationEngine.computeCognitiveRecommendations` |
| `trace` | `clDecisionTrace.buildDecisionTrace` / `buildInsightTrace` |
| `simulate` | `clScenarioUtils.runScenarioSimulation` |
| Analytics base | OPM-007 (`wiHeatmapUtils`, `wiCapacityUtils`, …) |

---

## Quality — providers encapsulados

| Operação | Provider domínio |
|----------|------------------|
| `runtime_context` | `qualityCognitiveRuntimeSignalAdapter.resolveQualityRuntimeContext` |
| `signals` | `buildCognitiveSignalsFromRuntime` |
| `insights` | `buildRuntimeInsightPack` |
| `recommendations` | `mergeRuntimeAndApiPacks` |

---

## Safety — providers encapsulados

| Operação | Provider domínio |
|----------|------------------|
| `pressure_analysis` | `safetyCognitivePressureAnalyzer.analyzeSafetyCognitivePressure` |
| `trace` | Derivado do pressure analysis (advisory) |

---

## Environment — providers encapsulados

| Operação | Provider domínio |
|----------|------------------|
| `insights_endpoint` | Referência API `environmentCognitive.runInsights` |
| `reasoning` | `EnvironmentReasoningWorkspace` |
| `recommendations` | Pack devolvido pelo hub domínio |

---

## Invariantes

- Contratos CPL-001 **inalterados** (teste `contracts.test.mjs`)
- Nenhum path `platform/cognitive/recommendation/` ou `decision/`
- Domínios OPM-003–008, Quality, Safety, Environment **não modificados**

---

## Testes

```bash
npm run test:cpl002-contracts   # 3/3
```
