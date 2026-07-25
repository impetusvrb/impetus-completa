# REG-001 — Route Audit

**Fonte:** `frontend/src/platform/audit/regression/reg001RouteAudit.js`

---

## React Router (App.jsx)

| Path | Componente | Guard | Status |
|------|------------|-------|--------|
| `/app/mapa-vazamento-financeiro` | MapaVazamentoFinanceiro | CEORouteGuard | mounted |
| `/app/centro-operacoes-industrial` | IndustrialOperationsCenter | canAccessIndustrialCore | mounted |
| `/app/monitored-points` | alias → IndustrialOperationsCenter | idem | mounted |
| `/app/insights` | InsightsPage | canAccessIndustrialCore | mounted |
| `/app/cerebro-operacional` | OperationalIntelligencePanel | canAccessIndustrialCore | mounted |
| `/app/industrial` | — | — | **orphan reference** |

Lazy imports: OK para as páginas auditadas.

---

## Backend mounts (dashboard.js)

| Path esperado | Status | Service existe? |
|---------------|--------|-----------------|
| `/api/dashboard/financial-leakage/*` | **not_mounted** | ✅ financialLeakageDetectorService |
| `/api/dashboard/industrial/*` | **not_mounted** | ✅ industrialOperationalMapService |
| `/api/dashboard/operational-brain/*` | mounted | ✅ dashboardOperationalBrain.js |
| `/api/dashboard/insights` | mounted | ✅ |
| `/api/dashboard/forecasting/*` | **partial** | ✅ (só projections, alerts, health) |
| `/api/dashboard/costs/*` | mounted | ✅ (FIN-AUD-001) |

---

## Conflitos

1. **industrial_core_guard_divergence** — Layout ≠ App (RBAC)
2. **forecasting partial** — cliente api.js com 8+ métodos; 3 montados
3. **orphan `/app/industrial`** — KPIs apontam path inexistente

---

## Rotas órfãs / duplicadas

- Órfã: `/app/industrial`
- Alias duplicado OK: `/app/centro-operacoes-industrial` ≡ `/app/monitored-points`
