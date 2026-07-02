# ADR-ECO-003 — Executive Consumer

**Status:** Aceite (contrato ECO-02)  
**Data:** 2026-07-02  
**Fase de implementação:** ECO-07  
**Relacionado:** EG-18, NC-INT-003

---

## Motivação

Os dashboards executivos (boardroom, Pulse executive, `dashboardContextAdapter` runtime Z.27, `organizationalIntelligenceEngine`) agregam métricas directamente da BD e de motores paralelos. O `governanceExecutiveInsightsService` (EG-18) está ONLINE mas **fora do pipeline de execução** — expõe KPIs via audit API. ECO-07 define dashboards como **consumidores** exclusivos de Executive Insights para métricas governadas.

---

## Arquitetura atual

| Fonte | Consumidor | Usa Executive Insights? |
|-------|------------|-------------------------|
| `pulseCognitive/executiveDashboard.js` | Pulse UI | ❌ |
| `cognitivePulseService.js` | Dashboard pulse | ❌ |
| `organizationalIntelligenceEngine.js` | Org intelligence | ❌ |
| `routes/dashboard.js` | Chat council | ❌ |
| `dashboardContextAdapter.js` (frontend) | Boardroom Z.27 | ❌ |
| `executiveMode.js` (send) | Notificações CEO | ✅ adapter send only |

**NC:** NC-INT-003 (frontend sem audit EG UI) — prioridade P2, resolvida em ECO-07.

---

## Arquitetura futura

```text
Event Governance → Policy Optimization
                 → governanceExecutiveInsightsService (audit API)
                 → Executive Consumer Layer (novo adapter frontend/backend)
                 → Executive Dashboards (única fonte KPIs governados)
```

Queries directas à BD para KPIs executivos **proibidas** em código novo; permitidas apenas como fallback shadow até ECO-08.

---

## Impacto

| Área | Impacto |
|------|---------|
| `frontend/…/dashboardContextAdapter.js` | Consome `/api/event-governance/audit/executive-insights` |
| `pulseCognitive/executiveDashboard.js` | Redirect para Executive Insights |
| `cognitivePulseService.js` | Deprecar agregações duplicadas |
| APIs públicas dashboard | **Sem breaking change** — DTO compatível via adapter |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| KPIs diferentes shadow vs legacy | Período de comparação 2 sprints |
| Latência API audit | Cache TTL 60s; stale indicator na UI |
| Gaps de métricas não modeladas EG | Extensão DTO audit (não pipeline) |

---

## Estratégia de migração

1. **Pré-requisito:** ECO-06 (Knowledge Base) completo.
2. **Adapter Executive Consumer:** normaliza resposta audit → DTO dashboard existente.
3. **Shadow dashboards:** exibe KPI EG + legacy lado a lado (feature flag).
4. **Cutover:** `ECO_EXECUTIVE_INSIGHTS_ONLY=true`.
5. **Frontend audit UI:** painel observabilidade EG (resolve NC-INT-003).

**Estratégia:** Consumer (adapter de leitura).

**Rollback:** `ECO_EXECUTIVE_INSIGHTS_ONLY=false` restaura agregação legacy.

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Inserir Executive Insights no pipeline exec | Alteraria EG v1 congelado |
| Manter dupla fonte indefinidamente | Métricas executivas inconsistentes |
| Novo endpoint público breaking | Viola restrição APIs públicas |

---

## Referências

- `backend/src/services/governanceExecutiveInsightsService.js`
- `backend/src/dto/governanceExecutiveInsightsDto.js`
- [`ECO_01_PARALLEL_FLOWS_INVENTORY.md`](../ECO_01_PARALLEL_FLOWS_INVENTORY.md) § E
