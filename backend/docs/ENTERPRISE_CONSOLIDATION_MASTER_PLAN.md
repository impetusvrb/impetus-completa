# IMPETUS — Enterprise Consolidation Master Plan

## Status: IMPLEMENTADO E VALIDADO

**Data:** 13 maio 2026  
**Testes:** 115 passed | 0 failed  
**Regressão:** 0 (74 governance + 48 vector safety inalterados)

---

## Arquitetura Enterprise

Todos os novos serviços vivem em `backend/src/services/enterprise/` — isolados do core existente por design.
Rota unificada: `/api/internal/enterprise/*`

### Feature Flags (safe by default)

| Flag | Default | Serviço |
|------|---------|---------|
| `IMPETUS_OPERATIONAL_TELEMETRY_ENABLED` | `true` | Telemetria operacional |
| `IMPETUS_EXECUTIVE_COMPOSITION_ENABLED` | `false` | Composição executiva |
| `IMPETUS_COGNITIVE_REGISTRY_ENABLED` | `true` | Registry de entrypoints |
| `IMPETUS_PIPELINE_AUTHORITY_MODE` | `shadow` | Modo authority (shadow/partial/primary/exclusive) |
| `IMPETUS_PIPELINE_AUTHORITY_ENABLED` | `false` | Pipeline authority ativo |
| `IMPETUS_PIPELINE_CONFIDENCE_THRESHOLD` | `0.7` | Threshold para pipeline decidir |
| `IMPETUS_ENTERPRISE_OBSERVABILITY_ENABLED` | `true` | Observabilidade enterprise |
| `IMPETUS_EXPLAINABILITY_ENABLED` | `true` | Explainability |
| `IMPETUS_ADAPTIVE_COGNITION_ENABLED` | `false` | Cognição adaptativa |
| `IMPETUS_ADAPTATION_POLICY` | `conservative` | Política de adaptação |
| `IMPETUS_AUTOMATED_GOVERNANCE_ENABLED` | `false` | Governance automatizada |
| `IMPETUS_AI_BENCHMARK_ENABLED` | `false` | Benchmark IA |
| `IMPETUS_COGNITIVE_SIMULATION_ENABLED` | `false` | Simulação cognitiva |
| `IMPETUS_ENVIRONMENTAL_COGNITIVE_ENABLED` | `false` | Cognição ambiental |

---

## Fases Implementadas

### Fase 1 — Operational Density Program
**Serviço:** `operationalTelemetryService.js`
- 8 domínios operacionais (production, maintenance, quality, energy, logistics, workforce, environment, telemetry)
- 8 tipos de fonte (PLC, SCADA, MES, ERP, sensor, edge, manual, API)
- Ingestão com normalização, deduplicação e timestamping
- Unified Operational Snapshot por tenant
- Data Freshness Governance (fresh/stale/degraded/offline)
- Tenant isolation nativo

### Fase 2 — Executive Experience Consolidation
**Serviço:** `executiveCompositionService.js`
- Widget Priority Engine com scoring por urgência/impacto/role
- Cognitive Dashboard Layout Scoring
- Executive Narrative Layer (determinística, sem LLM)
- Dynamic Dashboard Density por role e cognitive pressure
- Overload prevention (limites por hierarquia)

### Fase 3 — Full Cognitive Flow Unification
**Serviço:** `cognitiveEntrypointRegistry.js`
- 11 tipos de entrypoint catalogados
- 8 entrypoints default registados ao boot
- Lifecycle obrigatório: entrypoint → pipeline → governance → orchestration → policy → response
- Pipeline Authority Mode (shadow/partial/primary/exclusive)
- Legacy bypass detection e auditoria

### Fase 4 — Event Pipeline Authority
**Serviço:** `eventPipelineAuthorityService.js`
- 6 runtime targets (GPT, Claude, Gemini, sandbox, fallback, local)
- 5 estratégias de arbitragem (confidence, latency, cost, quality, balanced)
- Runtime scoring com EWA (exponential weighted average)
- Kill Switch instantâneo com rollback
- Escalação e fallback automáticos

### Fase 5 — Enterprise Observability
**Serviço:** `enterpriseObservabilityService.js`
- Traces distribuídos com spans
- Métricas Prometheus-compatible (counter, gauge, histogram)
- Export Prometheus text format
- 9 subsistemas monitorados
- Cold Storage Strategy (identificação de dados elegíveis)
- Snapshots periódicos

### Fase 6 — Full Explainability
**Serviço:** `cognitiveExplainabilityService.js`
- Grafo de explicabilidade (nós: event, policy, capability, arbitration, obligation, score, decision, response)
- Cognitive Decision Timeline
- Executive Explainability Panel: "por que apareceu?", "quem decidiu?", "qual score?"
- Decision source tracking (pipeline, council, policy_engine, arbitration, governance, human, fallback, adaptive)

### Fase 7 — Adaptive Cognition Engine
**Serviço:** `adaptiveCognitionEngine.js`
- Confidence Feedback Engine com EWA
- Learning Governance Layer (previne aprendizado destrutivo)
- Guards: MAX_WEIGHT_DELTA, MIN_CONFIDENCE_FLOOR, REGRESSION_DETECTION_WINDOW
- 3 políticas de adaptação (conservative, moderate, aggressive)
- Detecção automática de regressão

### Fase 8 — Automated Governance
**Serviço:** `automatedGovernanceEngine.js`
- Governance Action Engine (7 ações: reduce_autonomy, auto_rollback, cognitive_isolation, degrade_mode, alert, escalate_human, no_action)
- 5 Stability Policies (CSI critical, error rate, latency saturation, drift excessive, confidence collapse)
- Predictive Cognitive Failure (análise de tendências)
- Runtime Stability Policies com autonomia ajustável

### Fase 9 — AI Benchmark System
**Serviço:** `aiBenchmarkService.js`
- Benchmark Runtime para GPT, Claude, Gemini
- 6 dimensões de avaliação (latency, quality, divergence, hallucination, stability, cost)
- 6 tipos de tarefa (summary, classification, extraction, generation, analysis, conversation)
- Persistent Scoring com EWA
- Weighted Runtime Selection por tarefa

### Fase 10 — Cognitive Simulation Engine
**Serviço:** `cognitiveSimulationEngine.js`
- Before vs After Runtime (comparação de pipelines)
- Temporal Replay (captura e reexecução de contextos)
- Governance Regression Analysis (detecção sistémica)
- 4 verdicts: improved, regressed, stable, inconclusive

### Fase 11 — Environmental Cognitive Domain
**Serviço:** `environmentalCognitiveService.js`
- 6 domínios ambientais (energy, water, emissions, waste, compliance, efficiency)
- Data Layer com ingestão e histórico por tenant
- Normalization (tendências, índices de eficiência)
- Cognitive Adapter (alertas, insights, sustainability score)
- Executive Panel Data

### Fase 12 — Consolidação Final
- Rota unificada: `/api/internal/enterprise/*`
- Health check agregado de todos os 11 serviços
- 115 testes automatizados (0 falhas)
- Feature flags safe-by-default (serviços disruptivos desligados por default)
- Zero regressão nos testes existentes

---

## Endpoints API

```
GET  /api/internal/enterprise/health              — Health agregado
GET  /api/internal/enterprise/telemetry/health     — Telemetria
GET  /api/internal/enterprise/telemetry/snapshot/:id
GET  /api/internal/enterprise/telemetry/freshness/:id
POST /api/internal/enterprise/telemetry/ingest
POST /api/internal/enterprise/composition/compose
POST /api/internal/enterprise/composition/narrative
GET  /api/internal/enterprise/cognitive/entrypoints
GET  /api/internal/enterprise/pipeline/health
POST /api/internal/enterprise/pipeline/arbitrate
POST /api/internal/enterprise/pipeline/kill-switch/activate
GET  /api/internal/enterprise/observability/prometheus
GET  /api/internal/enterprise/explainability/explain/:id
POST /api/internal/enterprise/adaptive/feedback
POST /api/internal/enterprise/governance/evaluate
GET  /api/internal/enterprise/benchmark/compare
GET  /api/internal/enterprise/benchmark/best/:taskType
GET  /api/internal/enterprise/simulation/regressions
GET  /api/internal/enterprise/environmental/panel/:id
```

---

## Garantias de Runtime

1. **Zero breaking changes** — serviços enterprise isolados em `enterprise/`
2. **Feature flags** — tudo desligável sem restart
3. **Shadow mode** — pipeline authority inicia em shadow (observa, não decide)
4. **Kill switch** — rollback instantâneo para fallback
5. **Learning guards** — cognição adaptativa com regression detection
6. **Additive only** — nenhum serviço existente foi modificado (apenas server.js: +1 linha useRoute)
