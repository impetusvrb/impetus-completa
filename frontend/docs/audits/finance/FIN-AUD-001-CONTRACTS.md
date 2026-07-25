# FIN-AUD-001 — Contracts

**Fonte:** `frontend/src/platform/audit/finance/finAud001ContractsIndex.js`

---

## Contratos activos

### dashboard.costs ✅

| Endpoint | Estado |
|----------|--------|
| GET /api/dashboard/costs/by-origin | active |
| GET /api/dashboard/costs/executive-summary | active |
| GET/POST/PUT/DELETE /api/dashboard/costs/items | active |
| GET /api/dashboard/costs/top-loss | active |
| GET /api/dashboard/costs/projected-loss | active |

Provider: `backend/src/routes/dashboard.js`  
Consumer: `frontend/src/services/api.js`

### nexusWallet.admin ✅

Provider: `backend/src/routes/admin/nexusWallet.js`  
Consumer: `api.js` — checkout, ledger, reconcile

### VIEW_FINANCIAL ✅

Consumers: promptFirewall, smartPanelCommandService, secureContextBuilder, dashboardChartDataService

---

## Contrato broken ⚠️

### dashboard.financialLeakage

Cliente definido em `api.js`:

```javascript
financialLeakage: {
  getMap: () => api.get('/dashboard/financial-leakage/map'),
  getRanking: () => api.get('/dashboard/financial-leakage/ranking'),
  // ...
}
```

**Rotas não montadas** em `backend/src/routes/dashboard.js` (grep: 0 matches `financial-leakage`).

Service implementado: `financialLeakageDetectorService.js`

---

## Contratos metadata only

- `domain_authority.finance_pipelines` — budget, cashflow declarados sem runtime
- `SpendCenterContract` / `BudgetReference` — Supply cross-ref

---

## Contratos cross-domain

- `forecasting.profitLoss` — previsão com impacto financeiro
- `smartPanel.financeiro_dataset` — dataset cognitivo financeiro
