# C3 — Production Operational Intelligence + Economic Cognition

**IMPETUS · Fase C3**  
**Tipo:** Aditivo · Heurístico · Governado · Reversível

---

## Objectivo

Evoluir o Runtime Cognitivo de **interpretação contextual** para **inteligência operacional economicamente verificável**, sem ERP financeiro, sem auto-acções, sem authoritative global.

---

## C3.1 — Production Operational Graph

**Pacote:** `backend/src/cognitiveRuntime/productionGraph/`

| Módulo | Função |
|--------|--------|
| `productionOperationalGraphEngine.js` | 14 nós industriais (produção, manutenção, qualidade, OEE, fila, NC, …) com `causal_links` |
| `crossDomainCausalResolver.js` | Cadeias causais cross-domain com `causal_strength`, `evidence_density` |
| `operationalBottleneckIntelligence.js` | Gargalo dominante, propagação, perda estimada |

---

## C3.2 — Runtime Economic Intelligence

**Pacote:** `backend/src/cognitiveRuntime/economics/`

| Módulo | Função |
|--------|--------|
| `operationalEconomicImpactEngine.js` | Custos heurísticos (parada, NC, retrabalho, atraso, desperdício) |
| `preventiveActionEconomicEvaluator.js` | Economia evitada por acção preventiva **supervisionada** |
| `economicPressureIndexEngine.js` | EOPI — índice de pressão económica operacional |

**Limitação:** modelo heurístico (`IMPETUS_C3_HOURLY_COST_PROXY`); **sem integração ERP**.

---

## C3.3 — Real Confidence Engine

**Pacote:** `backend/src/cognitiveRuntime/confidence/`

Dimensões separadas (não flat score):

- narrative_confidence
- statistical_confidence
- causal_confidence
- operational_confidence
- historical_confidence
- unified_confidence_score (média governada)

`confidenceConsistencyValidator` detecta inflação; `confidenceEvolutionTracker` persiste em `backend/data/confidence-evolution/{tenant}.json`.

---

## C3.4 — Cognitive Utility Validation

**Pacote:** `backend/src/cognitiveRuntime/utility/`

- `cognitiveUtilityValidationEngine` — insights úteis vs ignorados, inferências confirmadas/rejeitadas
- `operatorFeedbackCorrelationEngine` — proxy de engagement operador
- `cognitiveTrustIndexEngine` — Cognitive Trust Index organizacional

---

## Integração `/dashboard/me`

Campos aditivos:

- `production_operational_graph_runtime`
- `operational_economic_runtime`
- `economic_pressure_runtime`
- `real_confidence_runtime`
- `cognitive_utility_runtime`
- `cognitive_trust_runtime`
- `production_bottleneck_runtime`
- `cognitive_c3_summary`

---

## Flags

```
IMPETUS_C3_PRODUCTION_GRAPH=on
IMPETUS_C3_ECONOMIC_INTELLIGENCE=on
IMPETUS_C3_REAL_CONFIDENCE=on
IMPETUS_C3_COGNITIVE_UTILITY=on
IMPETUS_C3_OBSERVABILITY=on
IMPETUS_C3_HOURLY_COST_PROXY=450
```

---

## Telemetria

`[COGNITIVE_C3]` — PRODUCTION_GRAPH_UPDATED, ECONOMIC_IMPACT_CALCULATED, CONFIDENCE_REBALANCED, COGNITIVE_UTILITY_UPDATED, BOTTLENECK_PROPAGATION_DETECTED, TRUST_INDEX_UPDATED

---

## Riscos e dependências

| Risco | Mitigação |
|-------|-----------|
| Custos heurísticos imprecisos | `impact_confidence`, `heuristic_model: true` |
| Grafo sem telemetria PLC real | pesos derivados de runtime consolidado + timeline C2 |
| Confiança inflada | `confidenceConsistencyValidator` + fallback cap |
| Dados esparsos | scores conservadores; dependência de `operational_memory_runtime` |

---

## Readiness

| Critério | Estado |
|----------|--------|
| Causalidade industrial correlacionada | ✔ grafo + chains |
| Impacto operacional estimado | ✔ heurístico |
| Confiança real multi-dimensional | ✔ |
| Utilidade cognitiva medida | ✔ |
| Trust index | ✔ |
| ERP / custo real | ✗ futuro |
| Auto-acção | ✗ bloqueado |

---

## Testes

```bash
npm run test:production-graph
npm run test:economic-intelligence
npm run test:real-confidence
npm run test:cognitive-utility
npm run test:trust-index
```

---

## Invariantes

- Motor A e V2 mantidos
- React inalterado
- Sem auto-remediation / auto-decisions / adaptive mutation
- Sem authoritative global
- Sem novos cockpits produto

---

*Relatório C3 — Enterprise Cognitive Operating Runtime em evolução para inteligência operacional verificável.*
