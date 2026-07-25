# WMS-004 — Command Center Exposure

**Tipo:** Apresentação only — sem lógica cognitiva adicional.

---

## Componentes

| Ficheiro | Função |
|----------|--------|
| `routes/wmsCommandCenterRegistry.js` | Registo exposição operacional |
| `WmsOperationalCcExposure.jsx` | Link workspace no CC |

---

## Condições de activação

`VITE_IMPETUS_LOGISTICS_CC` + `VITE_IMPETUS_LOGISTICS_WORKSPACE` (default **false**)

---

## Coexistência

- **logistics_native** cognitivo → `LogisticsNativeCockpitPromotion` (existente)
- **WMS operacional** → `WmsOperationalCcExposure` (WMS-004)

Sem alteração ao runtime cognitivo homologado.
