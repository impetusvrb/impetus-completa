# EVENT-GOVERNANCE-18 — Auditoria Executive Governance Insights

**Data:** 2026-06-20  
**Objectivo:** mapear camada executiva de consolidação estratégica  
**Escopo:** indicadores e KPIs — nunca altera motor, matching ou políticas

---

## Resumo

| Campo | Valor |
|-------|-------|
| Serviço | `governanceExecutiveInsightsService.js` |
| DTO | `governanceExecutiveInsightsDto.js` |
| Flag | `EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS=false` (default) |

```json
{
  "executive_insights_available": true,
  "executive_kpis_available": true,
  "executive_summary_available": true,
  "dashboard_dto_available": true
}
```

---

## Fontes consolidadas (read-only)

- Governance Intelligence (`governanceHealthScore`, trends)
- Policy Optimization (`policyEffectivenessScore`, conflitos)
- Learning (eventos, sucesso, falsos positivos)
- Operational Memory (entradas, padrões)
- Explainability (score médio)
- Observability (métricas globais)

---

## Indicadores Estratégicos (determinísticos)

| Indicador | Descrição |
|-----------|-----------|
| eventVolume | Volume de eventos analisados |
| severityDistribution | Distribuição por criticidade |
| resolutionRate | Taxa de resolução |
| recurrenceRate | Reincidência |
| falsePositiveRate | Falsos positivos |
| operationalStability | Estabilidade operacional |
| confidence | Média e tendência |
| memoryScore | Média e tendência |
| explainabilityScore | Média e tendência |
| governanceHealthScore | Score EG-16 |
| policyEffectivenessScore | Score EG-17 |

---

## Executive KPIs (derivados)

| KPI | Derivação |
|-----|-----------|
| governanceMaturityIndex | health + confidence + memory + explainability |
| operationalStabilityIndex | estabilidade − falsos positivos − reincidência |
| policyEfficiencyIndex | policyEffectivenessScore − penalidade conflitos |
| continuousImprovementIndex | tendências positivas + learning success |
| governanceEvolutionTrend | improving / stable / declining |

---

## Executive Summary

- Principais indicadores
- Tendências estruturadas
- Riscos identificados
- Recomendações consolidadas (`actionable: false`)
- Evolução histórica

Sem IA generativa — apenas dados estruturados.

---

## Não alterado

Event Backbone, pipeline operacional, matching, Learning, Memory, Explainability, Intelligence, Policy Optimization, APIs públicas.

---

## Audit

`GET /api/audit/event-governance/executive-insights`
