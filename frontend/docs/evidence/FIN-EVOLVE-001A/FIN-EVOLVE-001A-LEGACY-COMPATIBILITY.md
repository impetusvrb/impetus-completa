# FIN-EVOLVE-001A — Legacy Compatibility

**Provider:** `financeLegacyCompatibility.js`

## Padrão

```
Legacy Route → Redirect (replace) → Finance Route
```

## Registo de redirects

| Legacy | Finance oficial |
|--------|-----------------|
| `/app/centro-custos-industriais` | `/app/finance/costs` |
| `/app/mapa-vazamento-financeiro` | `/app/finance/leakage` |
| `/app/admin/nexusia-custos` | `/app/finance/billing` |

## Garantias

- Rotas legacy **permanecem registadas** em `App.jsx` (REG-002, bookmarks).
- Redirect transparente — utilizador chega à experiência Finance unificada.
- Matriz REG-002 (`reg002DeadClickMatrix.js`) **não alterada** (certificada · frozen).
- Deep-links em widgets UI actualizados para rotas oficiais `/app/finance/*`.

## API

- `resolveLegacyFinanceRedirect(pathname)` — resolve destino
- `isFinanceLegacyPath(pathname)` — detecta path legacy
- `getFinanceLegacyRedirectRegistry()` — evidência de compatibilidade
