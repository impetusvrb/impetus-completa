# WMS-007A — Workspace Decoupling & Standalone Module Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Corrective (Frontend Only)  
**Data:** 2026-07-18  
**Parecer:** COMPLETED

---

## Desacoplamento

- `WmsStandaloneGate` — wrapper técnico invisível (flags)
- `WmsStandaloneModuleFrame` — header individual por módulo
- `WmsOperationalNav` — desactivado (return null)
- `WmsFoundationShell` — deprecated
