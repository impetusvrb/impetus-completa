# Final Delivery Resolution (Z.16)

## Pipeline obrigatório

```
identity → hierarchy → domain → authority → governance
  → contextual filtering → denied publications
  → final_visible_modules → TERMINAL LOCK → render
```

Implementação: `finalDeliveryResolution.js` + `finalModuleAuthority.js`.

## Autoridade

- `final_visible_modules` é a única lista autorizada após lock.
- `contextual_modules_mode` passa a `STRICT` (sem enrich).
- Módulos em `denied_publications` nunca voltam ao menu nem ao contextual.

## Frontend

Com `final_governance_locked`, `Layout.jsx` ignora `buildHybridMenu` e `safeMerge*`; usa apenas `baseMenuItems` + `applySidebarGovernanceAdapter`.
