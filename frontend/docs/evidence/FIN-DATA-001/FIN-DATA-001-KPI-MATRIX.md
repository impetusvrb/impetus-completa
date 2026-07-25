# FIN-DATA-001 — KPI Source Matrix

**Programa:** FIN-DATA-001  
**Âmbito:** KPIs do Release 2.0 (FIN-EVOLVE-002)  
**Fonte:** `financeKpiMatrix.js`

---

## Matriz

| KPI | Label | Fonte | Proprietário | API | Status | Nota |
|-----|-------|-------|--------------|-----|--------|------|
| cost_day | Custo operacional / dia | industrial_cost_service | industrialCostService | executive-summary | partial | path `summary.operational.per_day` |
| cost_month | Custo operacional / mês | industrial_cost_service | industrialCostService | executive-summary | partial | idem |
| event_impact_24h | Impacto eventos 24h | industrial_cost_service | industrialCostService | executive-summary | partial | impact via nesting |
| top_loss | Maior perda | industrial_cost_service | industrialCostService | top-loss | partial | alias impact\|total |
| projected_loss | Perda projectada | industrial_cost_service | industrialCostService | projected-loss | partial | alias projected\|total |
| leakage_projected | Impacto leakage projectado | financial_leakage | financialLeakageDetectorService | projected-impact | available | — |
| economic_proxy | Custo industrial (proxy) | industrial_cost_service | industrialCostService | executive-summary | partial | fallback per_day |
| billing_status | Billing / Wallet | nexus_wallet | nexusWalletService | admin nexus-wallet | partial | admin RBAC / soft-fail |
| by_origin_chart | Custos por origem | industrial_cost_service | industrialCostService | by-origin | available | ImpetusChart |
| leakage_alerts | Alertas financeiros | financial_leakage | financialLeakageDetectorService | alerts | available | — |
| leakage_ranking | Ranking vazamentos | financial_leakage | financialLeakageDetectorService | ranking | available | — |
| wallet_balance | Saldo Wallet | nexus_wallet | nexusWalletService | admin nexus-wallet | partial | módulo billing |
| ledger_entries | Ledger entries | nexus_ledger | nexusBillingEngine | billing-ledger | available | fora da strip R2.0 |

---

## Legenda de status

| Status | Significado |
|--------|-------------|
| available | Contrato e campo estáveis para consumo hub |
| partial | API existe; nesting/alias/RBAC/qualidade a certificar |
| absent | Sem origem oficial (nenhum neste release) |

---

## Acção pré-2.1 (sem mudar backend certificado)

Normalizar **apenas no compose adapter** (`financeExecutiveCompose` / hook) os aliases:

- `summary.operational.*` vs payload flat  
- `top_loss.impact` vs `total`  
- `projected_loss.projected` vs `total|value`

Isto fecha GAP-FD-002 sem alterar contratos públicos.
