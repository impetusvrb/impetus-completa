# WMS-004 — Navigation

**Registry:** `wmsOperationalRegistry.js`  
**RBAC:** `wmsRbacNavigation.js` (espelho WMS-003)

---

## Base path

`/app/logistics-operational/workspace`

---

## RBAC

Navegação filtrada por perfil WMS existente:

- `warehouse_operator`
- `warehouse_supervisor`
- `warehouse_manager`

Sem novas regras de autorização — apenas visibilidade UI.

---

## Menu

`menu_visible: false` por defeito até WMS-005 (validação operacional).

---

## Telemetria

`wmsUiObservability.js` — carregamento workspace, chamadas API, erros navegação.

Sem PII.
