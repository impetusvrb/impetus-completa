# UX-001 — Navigation

**Entrega:** UX-001 — Unified Navigation (Presentation Layer)  
**Data:** 2026-07-18

## Presentation Navigation Registry

- `frontend/src/presentation/navigation/presentationNavigationRegistry.js`
- Adaptadores read-only: logistics_wms, supply, quality, safety, environment
- Merge: `mergePresentationNavigation.js`

## Rotas WMS (existentes)

| Módulo | Rota canónica |
|--------|---------------|
| Dashboard | `/app/logistics-operational/workspace` |
| Armazéns | `/app/logistics-operational/workspace/warehouses` |
| Inventário | `/app/logistics-operational/workspace/inventory` |
| Recebimento | `/app/logistics-operational/workspace/receiving` |
| Picking | `/app/logistics-operational/workspace/picking` |
| Expedição | `/app/logistics-operational/workspace/shipping` |
| Transferências | `/app/logistics-operational/workspace/transfers` |

> Alias `/app/logistics-operational/dashboard` **não** criados — exigiria nova rota App.jsx (fora do escopo Presentation Layer).
