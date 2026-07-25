# OPS-002 — Workspace Publication

**Path:** `/app/logistics-operational/workspace`  
**Flags activas:** YES  
**Modo menu:** WmsOperationalNav (in-workspace) + registry menu_visible via isWmsMenuVisible()

---

## Modulos WMS-004

| Modulo | Registry | Layout | Nav | Estado |
| --- | --- | --- | --- | --- |
| dashboard | YES | YES | NO | ✅ PASS |
| warehouses | YES | YES | NO | ✅ PASS |
| inventory | YES | YES | NO | ✅ PASS |
| receiving | YES | YES | NO | ✅ PASS |
| picking | YES | YES | NO | ✅ PASS |
| shipping | YES | YES | NO | ✅ PASS |
| transfers | YES | YES | NO | ✅ PASS |

## Integracao arquitectural

| ID | Componente | Estado | Notas |
| --- | --- | --- | --- |
| workspace_registry | wmsOperationalRegistry.js | ✅ PASS | Registry WMS-004 congelado |
| workspace_shell | WmsFoundationShell.jsx | ✅ PASS | Shell activo com flags piloto |
| internal_nav | WmsOperationalNav.jsx | ✅ PASS | Menu módulos dentro do workspace (arquitectura WMS-004) |
| layout_global_menu | Layout.jsx ↔ WMS-004 | ⚠️ WARNING | Sidebar global não consome WMS registry — menu via WmsOperationalNav no workspace |
| logistics_publication_engine | logisticsMenuPublicationEngine.js | ✅ PASS | Domínio logística cognitiva (/app/logistics/operational) — separado de WMS-004 |
| command_center_exposure | WmsOperationalCcExposure | ✅ PASS | flagsOn && VITE_IMPETUS_LOGISTICS_CC=true → CC exposto |
| dist_published | frontend/dist | ✅ PASS | Build contém chunks WMS-004 |

**API contract:** /logistics-operational/v1 (WMS-003 public APIs only)

**Classificacao:** ⚠️ WARNING
