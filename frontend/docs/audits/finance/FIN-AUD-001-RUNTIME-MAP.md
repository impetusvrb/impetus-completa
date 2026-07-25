# FIN-AUD-001 — Runtime Map

**Fonte:** `frontend/src/platform/audit/finance/finAud001RuntimeMap.js`

---

## Runtimes mapeados

| runtimeId | Estado | Nota |
|-----------|--------|------|
| finance_native | GREENFIELD | Reservado GF-021 — não implementado |
| accountingRuntime | n/a | Não encontrado |
| financialRuntime | audit utility | `_financialRuntime()` em pilot audit — não é runtime domínio |
| nexus_billing_engine_v4 | **active** | Motor billing IA — ledger append-only |
| cognitive_budget_runtime | active | Budget contexto IA — **não** orçamento ERP |
| observation_cost_control | active | SZ4 observação — cross-domain |
| unified_cost_control | active | Custo cognitivo CPM — out-of-scope ERP |
| cognitive_economics | partial | operationalEconomicImpactEngine, economicPressureIndexEngine |
| cognitive_runtime_foundation | active | multiDomainResolver — peso financial 0.25 metadata |

---

## Distinção crítica

| Runtime | Scope |
|---------|-------|
| nexusBillingEngine | Monetização plataforma IA (créditos, wallet) |
| industrialCostService | Inteligência financeira **operacional** industrial |
| finance_native | Futuro domínio ERP/contabilidade — **não existe** |
| cognitiveBudgetRuntime | Infraestrutura IA — não confundir com budget financeiro |

---

## Feature flags relacionados

- `NEXUS_BILLING_ENGINE_V4`
- `NEXUS_CREDIT_WALLET`
- `ENABLE_TOKEN_BILLING`
- `IMPETUS_CONTEXTUAL_MODULES_FINANCE`
