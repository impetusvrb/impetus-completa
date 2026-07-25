# GF-027 — Workspace Registration

**Frontend:** `frontend/src/domains/supply/`

---

## Navegação

| Item | Valor |
|------|-------|
| Path | `/app/supply/workspace` |
| Registry | `supplyWorkspaceRegistry.js` |
| Menu visible | **false** (flags) |

---

## Feature flags FE

| Flag | Default |
|------|:-------:|
| `VITE_IMPETUS_SUPPLY_ENABLED` | false |
| `VITE_IMPETUS_SUPPLY_MENU` | false |
| `VITE_IMPETUS_SUPPLY_WORKSPACE` | false |
| `VITE_IMPETUS_SUPPLY_MENU_VISIBLE` | false |

---

## Centro de Comando

| Item | Valor |
|------|-------|
| Runtime | `supply_native` |
| Payload | `supply_cognitive_runtime` |
| Hubs | 7 (GF-021) |
| Promotion | `SupplyNativeCockpitPromotion.jsx` |

Registo CC activo apenas quando flags + `consolidation_applied` no payload.

---

## Ficheiros

- `pages/SupplyWorkspacePage.jsx`
- `components/SupplyFoundationShell.jsx`
- `services/supplyApi.js`
- `cockpit/supplyHubs.jsx`
- `cognitiveRuntime/cockpit/supplyNativeCockpitRegistry.js`
