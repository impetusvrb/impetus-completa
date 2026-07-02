# EVENT-GOVERNANCE-16 — Auditoria Governance Intelligence

**Data:** 2026-06-20  
**Objectivo:** mapear camada de inteligência de governança e melhoria contínua  
**Escopo:** observação e recomendações — sem alteração automática de comportamento

---

## Resumo

| Campo | Valor |
|-------|-------|
| Serviço | `governanceIntelligenceService.js` |
| Health Score | `governanceHealthScore` (0.0–1.0) |
| Flag | `EVENT_GOVERNANCE_INTELLIGENCE=false` (default) |

```json
{
  "governance_intelligence_available": true,
  "governance_health_score_available": true
}
```

---

## Pré-requisitos

EG-01 → EG-15 concluídos. Fontes: snapshots pipeline, observability, learning/memory/explainability metrics.

---

## Health Analytics (determinístico)

| Indicador | Descrição |
|-----------|-----------|
| decisionStability | Taxa de execuções bem-sucedidas |
| falsePositiveRate | Taxa de falsos positivos inferidos |
| recurrenceRate | Média de reincidência (memory) |
| confidenceTrend | Delta 1ª vs 2ª metade amostra |
| memoryScoreTrend | Evolução memoryScore |
| explainabilityScoreTrend | Evolução explainabilityScore |
| averageResolutionTimeMs | Latência média execução |
| severityDistribution | Distribuição por criticidade |
| policyDistribution | Distribuição por política |

---

## Recommendation Engine

| Tipo | Gatilho |
|------|---------|
| `policy_low_success` | Política ≥3x com sucesso <50% |
| `false_positive_increase` | falsePositiveRate >25% |
| `recurrence_growth` | recurrenceRate >30% |
| `confidence_decline` | confidenceTrend < -0.1 |
| `operational_degradation` | decisionStability <60% |

Recomendações **registradas, nunca executadas**.

---

## governanceHealthScore

Independente de `confidence`, `memoryScore`, `explainabilityScore`. Representa saúde global do sistema de governança.

---

## Improvement Report

`buildImprovementReport()` — tendências, indicadores, recomendações abertas, histórico, oportunidades.

---

## Não alterado

Event Backbone, matching, Learning, Memory, Explainability, AIOI, APIs públicas, DTOs.

---

## Observabilidade

`intelligence_runs`, `recommendations_generated`, `governance_health_score`, `trend_detections`, `intelligence_errors`

---

## Audit

`GET /api/audit/event-governance/intelligence`
