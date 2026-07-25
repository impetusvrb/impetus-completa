# REG-001 — Root Cause Analysis

**Fonte:** `frontend/src/platform/audit/regression/reg001RootCause.js`

---

## Hipótese

> A evolução Logística (EOX, OPM, CPL) introduziu regressões em módulos corporativos já existentes.

**Veredicto:** parcialmente confirmada.

### Nuance

- **Gaps HTTP** (leakage, industrial, forecasting parcial) = padrão *activação em falta* — service + cliente + UI existem; handlers não montados.
- **Guard mismatch** = endurecimento RBAC divergente entre menu e rota.
- CPL/EOX **não montam** `dashboard.js` — não são causa directa dos 4 paths legacy `/app/*`.
- A **janela temporal** (pós 18/07) coincide com alterações intensas em App/Layout/registries — correlação, não prova de remoção intencional.

---

## Causas por feature

| Feature | Primary | Secondary |
|---------|---------|-----------|
| Mapa Vazamentos | route_not_mounted | — |
| Mapa Industrial | route_not_mounted | rbac_guard_mismatch |
| Operational Insights | rbac_guard_mismatch | mock masking |
| Cérebro Operacional | rbac_guard_mismatch | dead_click (widget CC) |

---

## Padrões sistémicos

1. **service_without_http_mount** — leakage, industrial, forecasting
2. **menu_route_guard_divergence** — industrial core trio
3. **stale_inventory_docs** — M1 / BACKEND_INVENTORY afirmam montado
4. **widget_without_deeplink** — Centro Comando

---

## Não é causa raiz

- CPL-001/002/003
- OPM-003–008 (paths `/app/logistics/*` separados)
- WMS-REF-001 / OPM-GOV-001
