# ECO-05 — Inventário Pulse (PARTE 1)

**Fase:** 5 · **Data:** 2026-07-02 · **NC:** NC-INT-006

---

## Cálculos internos

| Módulo | Função | Tipo |
|--------|--------|------|
| `indexCalculator.js` | `computePulseIndex` | Pulse próprio |
| `stateEngine.js` | `inferOrganizationalState` | Pulse próprio |
| `cognitiveMotor.js` | `buildOrganizationalUnderstanding` | Pulse próprio |
| `crossDomainCorrelation.js` | `analyzeCrossDomain` | Pulse próprio |
| `temporalLearning.js` | `analyzeTemporalLearning` | Pulse próprio |
| `explainability.js` | `buildExplainability` | Pulse próprio (domínio humano) |
| `eventIngestion.js` | ingestão + persistência | Pulse próprio (legado) |

---

## Indicadores produzidos

| Indicador | Fonte | Classificação |
|-----------|-------|---------------|
| `pulse_index` | indexCalculator | **Permanece próprio** |
| `organizational_state` | stateEngine | **Permanece próprio** |
| `domain_states` | executiveDashboard | **Pode consumir EG** (health/confidence) |
| `confidence` | stateEngine/index | **Pode consumir EG** |
| `cross_domain_insights` | crossDomainCorrelation | **Permanece próprio** |
| `governanceHealthScore` | — (não existia) | **Consome EG** |
| `policyEffectivenessScore` | — | **Consome EG** |
| Executive KPIs | — | **Consome EG** (Executive Insights) |

---

## Decisões próprias (pré-ECO-05)

| Ponto | Descrição | Pós-ECO-05 |
|-------|-----------|------------|
| `GOVERNANCE` constants | assistive_only, human_in_the_loop | **Permanece** (UX guardrails) |
| Index weighting | DIMENSIONS weights | **Permanece próprio** |
| Pattern detection | correlationPack | **Permanece próprio** |
| Analytics governance scores | recalculados implicitamente | **Consome EG** (flag ON) |

---

## Analytics redundantes

| Pulse | EG equivalente | Acção ECO-05 |
|-------|----------------|--------------|
| confidence (state) | governanceConfidenceService | Consumir |
| health proxy (pulse_index/100) | governanceHealthScore | Consumir |
| — | memoryScore | Consumir |
| explainability (humano) | explainabilityScore EG | Shadow compare |
| — | policyEffectivenessScore | Consumir |
| executive domain KPIs | Executive Insights KPIs | Consumir (ECO-07 full) |

---

## Dependências

```text
pulseCognitiveService
  → perceptionLayer, indexCalculator, cognitiveMotor
  → executiveDashboard, eventIngestion
  → [ECO-05] pulseGovernanceConsumerAdapter
```

---

## Consumidores

| Consumidor | Entry |
|------------|-------|
| `routes/pulseCognitive.js` | API Pulse |
| Frontend Pulse dashboards | via API |
| `cognitivePulseService.js` | integração legada |

---

## Classificação final

| Classificação | Módulos |
|---------------|---------|
| **Consome EG** | getExecutiveDashboard analytics layer |
| **Permanece próprio** | ingestão, index, perception, temporal, cross-domain |
| **Legado** | GOVERNANCE constants (retirement ECO-08) |
