# REG-001 — Connectivity Matrix

**Fonte:** `frontend/src/platform/audit/regression/reg001ConnectivityMatrix.js`

---

## Cadeia canónica

```
UI → Route → Guard → api.js → dashboard.js mount → Service → Data
```

---

## Matriz

### Mapa Vazamento

| Layer | OK? | Detail |
|-------|-----|--------|
| UI | ✅ | MapaVazamentoFinanceiro.jsx |
| Route | ✅ | /app/mapa-vazamento-financeiro |
| api.js | ✅ | financialLeakage.* |
| dashboard.js | ❌ | financial-leakage/* NOT mounted |
| Service | ✅ | financialLeakageDetectorService.js |
| Data | ? | unreachable |

**Break:** `api.js → dashboard.js`

### Mapa Industrial

| Layer | OK? | Detail |
|-------|-----|--------|
| UI | ✅ | IndustrialOperationsCenter.jsx |
| Route | ✅ | /app/centro-operacoes-industrial |
| Guard | ⚠️ | diretor genérico blocked |
| api.js | ✅ | industrial.* |
| dashboard.js | ❌ | industrial/* NOT mounted |
| Service | ✅ | industrialOperationalMapService.js |

**Break:** `dashboard.js mount` (+ guard)

### Operational Insights

| Layer | OK? | Detail |
|-------|-----|--------|
| UI→API→Service | ✅ | GET /insights montado |
| Guard | ⚠️ | mismatch |
| Data | ⚠️ | mock fallback InsightsList |

**Break:** Guard / mock masking

### Cérebro Operacional

| Layer | OK? | Detail |
|-------|-----|--------|
| UI→operational-brain→Service | ✅ | cadeia íntegra |
| Guard | ⚠️ | mismatch |
| Widget CC | ⚠️ | chat sem deep-link |

**Break:** Guard / UX deep-link

### Centro Previsão

| Layer | OK? | Detail |
|-------|-----|--------|
| forecasting mount | ⚠️ partial | 3/11+ endpoints |
| Service | ✅ | operationalForecastingService |

**Break:** partial mount

---

## Clientes api.js órfãos (além dos 4)

financialLeakage, industrial, forecasting (partial), dynamic-layout, user-context, log-activity, executive-query, org-ai-assistant.
