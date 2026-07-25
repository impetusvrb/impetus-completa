# REG-002 R1 — Financial Leakage Recovery

**Fase:** REG-002  
**Princípio:** RECONNECT BEFORE REBUILD  
**Prioridade:** P1

---

## Antes → Depois

| Item | Antes | Depois | Evidência |
|------|-------|--------|-----------|
| UI MapaVazamentoFinanceiro | ✅ | ✅ (inalterada) | `pages/MapaVazamentoFinanceiro.jsx` |
| React route | ✅ | ✅ | `/app/mapa-vazamento-financeiro` |
| api.js client | ✅ | ✅ | `dashboard.financialLeakage.*` |
| Backend mount | ❌ | ✅ | `router.use('/financial-leakage', …)` |
| Service | ✅ | ✅ (inalterado) | `financialLeakageDetectorService.js` |

---

## Causa raiz

`route_not_mounted` — service + cliente + UI existiam; handlers HTTP ausentes em `dashboard.js`.

## Alteração aplicada

Router thin `backend/src/routes/dashboardFinancialLeakage.js` montado em `dashboard.js`:

- GET `/map` → `getLeakMap`
- GET `/ranking` → `getLeakRanking`
- GET `/alerts` → `getAlerts`
- GET `/report` → `generateAIReport`
- GET `/projected-impact` → `getProjectedImpact`

## Ficheiros modificados

- `backend/src/routes/dashboardFinancialLeakage.js` (**novo** — wiring only)
- `backend/src/routes/dashboard.js` (1 linha `router.use`)

## Risco

Low — delegação exclusiva ao service existente.

## Rollback

Remover `router.use('/financial-leakage', …)` e o ficheiro do router.

## Validação

```bash
npm run test:reg002-financial-leakage
```
