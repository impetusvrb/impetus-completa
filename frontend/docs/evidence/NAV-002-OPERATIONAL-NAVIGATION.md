# NAV-002 — Operational Navigation Experience (ONX)

**Programa:** Presentation Evolution  
**Entrega:** NAV-002  
**Modo:** SAFE INCREMENTAL IMPLEMENTATION  
**Data:** 2026-07-19

---

## Declaração de conformidade

```
PRESENTATION_ONLY              = YES
BACKEND_MODIFIED               = NO
NAV-001_MODIFIED               = NO
SIDEBAR_MODIFIED               = NO
RBAC_MODIFIED                  = NO
WMS-007A_ROUTES_PRESERVED      = YES (layout adapter)
```

---

## Objectivo

Eliminar sensação de isolamento dos módulos standalone (pós WMS-007A) com navegação contextual corporativa reutilizável em toda a plataforma.

---

## Componente canónico

**`OperationalNavigationHeader`** — único header genérico (sem WarehouseNavigationHeader, etc.)

Localização: `frontend/src/presentation/operational-navigation/`

| Ficheiro | Função |
|----------|--------|
| `OperationalNavigationHeader.jsx` | Breadcrumb + back + contexto |
| `OperationalModuleShell.jsx` | Wrapper módulo + header |
| `operationalNavigationRegistry.js` | Domínios plataforma |
| `operationalNavigationDeepLink.js` | Arquitectura deep link CC |
| `useOperationalNavigation.js` | Hook rotas logísticas |

---

## Integração WMS

Adapter: `domains/logistics-operational/layout/WmsOperationalNavLayout.jsx`  
Rotas: `WmsLogisticsStandaloneRoutes.jsx` — layout ONX envolve 6 módulos

---

## Módulos com ONX activo

Warehouses · Inventory · Receiving · Picking · Shipping · Transfers

---

## Parecer

**NAV-002 — COMPLETED**
