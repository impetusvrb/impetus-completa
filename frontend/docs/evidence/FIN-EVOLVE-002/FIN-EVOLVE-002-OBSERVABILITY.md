# FIN-EVOLVE-002 — Observability

Eventos emitidos via `CustomEvent('impetus:finance')`:

| Evento | Quando |
|--------|--------|
| `finance.dashboard.loaded` | Painel executivo carregou composição |
| `finance.kpi.opened` | Interacção com strip de KPIs |
| `finance.alert.opened` | Clique em alerta / link leakage |
| `finance.insight.clicked` | Clique em insight |
| `finance.decision.executed` | Clique "Executar" numa decisão |

API: `trackFinanceDashboardLoaded`, `trackFinanceKpiOpened`, `trackFinanceAlertOpened`, `trackFinanceInsightClicked`, `trackFinanceDecisionExecuted`.
