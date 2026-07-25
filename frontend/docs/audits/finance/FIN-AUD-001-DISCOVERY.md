# FIN-AUD-001 — Discovery

**Programa:** FIN-AUD-001 — Finance Domain Discovery & Architectural Audit  
**Fonte canónica:** `frontend/src/platform/audit/finance/finAud001DiscoveryIndex.js`  
**Princípio:** AUDIT BEFORE BUILD

---

## Objetivo

Varredura read-only do ecossistema IMPETUS para localizar capacidades financeiras, contábeis, fiscais, orçamentárias, patrimoniais, custos, controladoria e tesouraria — **sem alterar código**.

---

## Termos de varredura

Finance, Financial, Accounting, Ledger, Treasury, Cash, Budget, Fiscal, Tax, Cost, Cost Center, Asset, Payment, Receivable, Payable, Invoice, Billing, Bank, Reconciliation, Closing, ERP.

---

## Descoberta principal

| Conclusão | Evidência |
|-----------|-----------|
| **Domínio Finance nativo não existe** | `domains/finance/` ausente; EOX `active: false` |
| **Finanças operacionais maduras** | `industrialCostService`, API `/costs/*`, UI Centro Custos |
| **Vazamento financeiro parcial** | Service completo; rotas HTTP em falta |
| **Billing Nexus maduro** | `nexusBillingEngine` v4, wallet, ledger |
| **ERP contabilístico ausente** | Sem AP/AR, tesouraria, reconciliação bancária |

---

## Estado domínio Finance

```javascript
FINANCE_DOMAIN_STATUS = {
  nativeDomainPath: null,
  financeNativeRuntime: 'GREENFIELD — reservado (GF-021, DEC-001)',
  eoxEntry: 'active: false, /app/finance PLANNED',
  cplAdapter: null,
  maturity: 'placeholder'
}
```

---

## Categorias descobertas

| Categoria | Qtd (catálogo audit) | Exemplos |
|-----------|---------------------|----------|
| service | 6+ | industrialCostService, financialLeakageDetector |
| api | 1+ | dashboard /costs/* |
| ui_page | 4+ | CentroCustosExecutivo, MapaVazamentoFinanceiro |
| contextual_module | 3 | financial_intelligence, cost_center, losses_map |
| runtime | 1 | nexusBillingEngine v4 |
| registry | 2 | domainAuthority finance, EOX finance |
| permission | 1 | VIEW_FINANCIAL |
| cognitive_engine | 1+ | operationalEconomicImpactEngine |
| cross_domain | 5+ | Supply budget, MES/ERP, Logistics NF |

---

## Referências cruzadas (regra adicional)

Capacidades relevantes **fora** do domínio Finance registadas como cross-ref apenas:

- Supply: `BudgetReference`, `SpendAnalysisService`
- Production: MES/ERP, widget finance suppression
- Logistics: campo NF recebimento
- cognitiveRuntime: economics engines

---

## API

```javascript
import { FIN_AUD_DISCOVERY_CATALOG, listCrossDomainReferences } from 'platform/audit/finance';
```
