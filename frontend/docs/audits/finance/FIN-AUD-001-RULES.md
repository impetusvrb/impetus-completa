# FIN-AUD-001 — Rules Discovery

**Fonte:** `frontend/src/platform/audit/finance/finAud001RulesIndex.js`

---

## Regras identificadas (sem modificação)

| ruleId | Tipo | Localização |
|--------|------|-------------|
| view_financial_rbac | permission | authorize.js |
| can_see_costs | calculation_gate | dashboardChartDataService.js |
| prompt_firewall_financial | validation | promptFirewall.js |
| domain_isolation_finance | guard | domainIsolationGuard.js |
| supply_budget_compliance | policy | supplyDomainPolicies.js (cross-ref) |
| production_finance_widget_suppression | guard | productionWidgetSuppression.js (cross-ref) |
| financial_leakage_role_mask | scoring | financialLeakageDetectorService.js |
| nexus_billing_authorize | workflow | nexusBillingEngine |
| retention_fiscal_billing | policy | retentionPolicyRegistry.js |
| contextual_module_finance_unlock | workflow | moduleCapabilities.js |

---

## Achado M1 documentado

`can_see_costs` em `dashboardChartDataService` usa lógica role-based (ceo/financeiro/diretor) — divergência documentada em M1.15 vs RBAC table `VIEW_FINANCIAL`.

**Implicação:** não assumir que VIEW_FINANCIAL e can_see_costs são equivalentes sem validação.

---

## Cross-domain rules

Regras em Supply e Production registadas como referência — **não migrar** para domínio Finance.
