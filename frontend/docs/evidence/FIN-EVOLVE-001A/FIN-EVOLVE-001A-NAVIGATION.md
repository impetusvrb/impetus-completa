# FIN-EVOLVE-001A — Navigation

**Provider:** `financeNavigationMetadata.js`

## Padronização

| Camada | Fonte |
|--------|-------|
| Menu lateral | `FINANCE_SIDEBAR_MENU_ITEMS` → Layout.jsx |
| EOX resolver | `buildFinanceEoxNavigationConfig` |
| Breadcrumbs | `buildFinanceBreadcrumb` |
| Contextual modules | `FINANCE_CONTEXTUAL_MENU_OVERRIDES` |
| Deep-links widgets | `FINANCE_OFFICIAL_DEEP_LINKS` |

## Breadcrumb canónico

```
Centro Cognitivo → Finance → [Módulo]
```

Exemplos:

- `/app/finance/costs` → Centro Cognitivo · Finance · Centro de Custos Industriais
- `/app/finance/leakage` → Centro Cognitivo · Finance · Mapa de Vazamentos

## Deep-links oficiais

| Widget / módulo | Rota oficial |
|-----------------|--------------|
| `cost_center` | `/app/finance/costs` |
| `leak_map` / `losses_map` | `/app/finance/leakage` |
| `financial_intelligence` | `/app/finance` |
| `nexus_billing` | `/app/finance/billing` |

## Consumidores actualizados

- `Layout.jsx` — menu Finance via metadata
- `contextualSidebarBuilder.js` — paths e label unificados
- `CenterWidget.jsx` — deep-links oficiais
- `WidgetMapaVazamentos.jsx` — deep-link leakage
- `financeEoxNavigation.js` — delega ao metadata provider
