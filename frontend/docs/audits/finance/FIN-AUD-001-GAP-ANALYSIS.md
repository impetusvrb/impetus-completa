# FIN-AUD-001 — Gap Analysis

**Fonte:** `frontend/src/platform/audit/finance/finAud001GapAnalysis.js`  
**Gerado após:** discovery, inventory, modules, runtimes, rules, contracts, cognitive, graph

---

## O que existe?

| Área | Estado |
|------|--------|
| Centros de custo industriais | ✅ complete |
| API dashboard /costs/* | ✅ complete |
| Contextual modules finance | ✅ registry complete |
| Nexus billing/wallet/ledger | ✅ complete |
| VIEW_FINANCIAL governance | ✅ complete |
| Mapa vazamento financeiro | ⚠️ partial (API gap) |
| Domínio Finance nativo | ❌ placeholder |

---

## O que está consolidado?

- `industrialCostService` + `/costs/*`
- CentroCustosExecutivo + CentroCustosAdmin
- nexusBillingEngine v4
- VIEW_FINANCIAL chain
- contextualModules categoria financial

---

## O que está incompleto?

- Rotas `/financial-leakage/*` não montadas
- MapaVazamentoFinanceiro depende de API broken
- domainRegistry pipelines budget/cashflow — metadata only
- EOX finance `active: false`

---

## O que está duplicado?

| Item | Avaliação |
|------|-----------|
| Custos industrial vs AIOI bottleneck | Scope diferente — OK |
| Páginas + widgets Centro Comando | Mesma API — reutilização OK |
| Advisory forecasting + smart panel + leakage | Sem engine central — by design CPL |

---

## O que pode ser reaproveitado?

1. `industrialCostService` como base inteligência financeira operacional
2. `financialLeakageDetectorService` — **activar rotas**, não reimplementar
3. contextualModules registry + unlock
4. VIEW_FINANCIAL + finance_management profile
5. domainAuthority metadata para futuro finance_native
6. CPL-003 governance para futuro finance_adapter
7. Supply BudgetReference como cross-ref procurement

---

## O que realmente precisa ser desenvolvido?

- Domínio `finance_native` (contabilidade, AP/AR, tesouraria, reconciliação)
- `accountingRuntime` / ERP statutory GL
- Pipelines budget/cashflow (declarados, não implementados)
- Widgets budget_variance, cashflow
- CPL finance_adapter (após domínio existir)
- Integração ERP contabilística (MES/ERP actual = produção only)

---

## Achado crítico

```
ID: financial_leakage_routes_gap
Severity: HIGH
Service: financialLeakageDetectorService.js ✅
Routes: /api/dashboard/financial-leakage/* ❌
Client: api.js financialLeakage ✅
Recommendation: Activar rotas antes de novo engine
```

---

## Referências cruzadas registadas

Supply budget, MES/ERP, Logistics NF, Production widget suppression — ver `listCrossDomainReferences()`.
