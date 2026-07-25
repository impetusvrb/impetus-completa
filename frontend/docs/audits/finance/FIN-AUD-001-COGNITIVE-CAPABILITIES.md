# FIN-AUD-001 — Cognitive Capabilities

**Fonte:** `frontend/src/platform/audit/finance/finAud001CognitiveAudit.js`

---

## Capacidades cognitivas financeiras auditadas

| Capability | Status | Localização |
|------------|--------|-------------|
| Previsão fluxo de caixa | **not_found** | Pipeline cashflow só em metadata |
| Análise risco financeiro | partial | economics engines + leakage detector |
| Recomendações financeiras | partial | smart panel dataset + forecasting |
| Detecção desvios | partial | financialLeakageDetector (API gap) |
| Orçamento / budget | experimental | Supply BudgetReference + domainRegistry |
| Indicadores custo | **active** | industrialCostService, AIOI, widgets |
| Saúde financeira executiva | partial | executive.financial_health block |
| CPL finance_adapter | **not_found** | CPL-002 sem adapter finance |

---

## Princípio CPL aplicável

A plataforma **não deve** criar novo Recommendation/Decision Engine financeiro. Capacidades cognitivas existentes são:

- **Operacionais** (custos, vazamentos, economics)
- **Plataforma** (Nexus billing)
- **Executivas** (blocos cognitiveRuntime)

---

## Cross-domain cognitive

- `operationalEconomicImpactEngine` — pressão custo operacional
- `aioiBottleneckCostService` — índices relativos custo AIOI
- Supply spend analysis — procurement budget

Registados como referência — não substituir.
