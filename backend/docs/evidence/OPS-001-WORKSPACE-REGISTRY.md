# OPS-001 — Workspace Registry Validation

**Workspace path (baseline):** `/app/logistics-operational/workspace`  
**Menu visible (registry estático):** false

---

| Registry | Ficheiro | Presente | Estado | Notas |
| --- | --- | --- | --- | --- |
| Workspace Registry | wmsOperationalRegistry.js | YES | ✅ PASS | — |
| Route Registry | App.jsx + wmsOperationalRegistry.js | YES | ✅ PASS | — |
| Command Center Registry | wmsCommandCenterRegistry.js + CentroComando.jsx | YES | ✅ PASS | — |
| Navigation Registry | Layout.jsx ↔ WMS-004 nav | NO | ⚠️ WARNING | — |
| Menu Registry | Layout.jsx menu pipeline | NO | ⚠️ WARNING | WMS-004 usa registry próprio; Layout integra logistics publication engine (domínio distinto) |

**Módulos no registry:** 8

**Classificação registry:** ⚠️ WARNING
