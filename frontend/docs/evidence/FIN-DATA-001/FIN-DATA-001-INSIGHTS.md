# FIN-DATA-001 — Executive Insight Mapping

**Programa:** FIN-DATA-001  
**Objectivo:** mapear o que **já existe** para Insights, Alertas, Recomendações e Decisões  
**Fonte:** `financeInsightsMapping.js`  
**Sem novos engines.**

---

## Mapa

| ID | Tipo | Label | Origem | Status | Limitações |
|----|------|-------|--------|--------|------------|
| insight_top_loss | insight | Maior perda operacional | industrial_cost_service | partial | aliases de campo |
| insight_leakage_rank | insight | Ranking de vazamentos | financial_leakage | available | não é GL/ERP |
| insight_projected_impact | insight | Impacto projectado | leakage + costs | available | horizonte curto |
| insight_by_origin | insight | Custos por origem | industrial_cost_service | available | chart, não narrativa |
| insight_billing | insight | Estado billing/wallet | nexus_wallet | partial | admin-gated; ≠ P&L |
| alert_leakage | alert | Alertas de leakage | financial_leakage | available | taxonomia leakage |
| alert_forecast | alert | Alertas forecasting | forecasting | partial | não wired no hub |
| recommendation_aioi | recommendation | AIOI / panel-command | recommendation_engine | partial | intents finance não certificados |
| decision_compose | decision | Decisões R2.0 | financeExecutiveCompose | available | heurística compose |
| decision_economic_proxy | decision | Sinais C3 | economic_engines | partial | erp_integrated false |

---

## Dependências por superfície R2.0

| Superfície hub | Fontes oficiais | Evidência |
|----------------|-----------------|-----------|
| Insights | costs + leakage | compose `insights[]` |
| Alertas | financial_leakage | `/financial-leakage/alerts` |
| Decisões sugeridas | costs + leakage | compose `decisions[]` (origin, impact, priority, evidence) |
| Recomendações AIOI | recommendation_engine | fora do hub; futuro 2.2+ |

---

## O que NÃO gerar nesta fase

- Novos cálculos de insight  
- Motor de recomendações Finance dedicado  
- Ligação automática forecasting → hub (aguardar contrato live)

Reutilizar compose R2.0 e owners oficiais.
