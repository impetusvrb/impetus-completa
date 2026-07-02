# EVENT-GOVERNANCE-19 — Auditoria Governance Knowledge Base

**Data:** 2026-06-20  
**Objectivo:** mapear base institucional de conhecimento do Event Governance  
**Escopo:** referências organizadas — nunca altera motor, pipeline ou políticas

---

## Resumo

| Campo | Valor |
|-------|-------|
| Serviço | `governanceKnowledgeBaseService.js` |
| DTO | `governanceKnowledgeBaseDto.js` |
| Flag | `EVENT_GOVERNANCE_KNOWLEDGE_BASE=false` (default) |

```json
{
  "knowledge_base_available": true,
  "knowledge_index_available": true,
  "knowledge_reports_available": true,
  "institutional_memory_available": true
}
```

---

## Knowledge Model (referências — sem duplicação)

| Fonte | Fase | Tipos indexados |
|-------|------|-----------------|
| Learning | EG-13 | decision, audit |
| Operational Memory | EG-14 | similar_case, history |
| Explainability | EG-15 | evidence |
| Governance Intelligence | EG-16 | decision, trend, recommendation |
| Policy Optimization | EG-17 | policy, recommendation, audit |
| Executive Insights | EG-18 | history, audit |

Cada entrada contém: `id`, `type`, `source`, `refId`, `keywords`, `metadata` (mínimo).

---

## Knowledge Index (pesquisa determinística)

Tipos: `policy`, `decision`, `evidence`, `trend`, `recommendation`, `similar_case`, `history`, `audit`

Filtros: `companyId`, `type`, `policyId`, `source`, `q` (keyword)

---

## Institutional Knowledge Report

- Histórico consolidado
- Evolução da governança
- Principais aprendizados
- Padrões recorrentes
- Indicadores históricos
- Referências cruzadas

Sem IA generativa.

---

## Não alterado

Event Backbone, pipeline operacional, matching, Learning, Memory, Explainability, Intelligence, Policy Optimization, Executive Insights, APIs públicas.

---

## Audit

`GET /api/audit/event-governance/knowledge-base`

Parâmetros opcionais: `companyId`, `type`, `policyId`, `q`
