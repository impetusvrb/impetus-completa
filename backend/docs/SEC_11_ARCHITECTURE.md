# SEC-11 — Arquitectura

## Camada aditiva

```
SEC-01→10 ──read-only──► securityAdaptiveProtection/
                              │
                              ├── Protection Profile Engine
                              ├── Adaptive Surface Manager
                              ├── Anti-Scanner Engine
                              ├── Runtime Shield
                              ├── Approval Engine
                              └── Recovery Planner
                              │
                              ▼
                         Protection Plan (never executed)
```

**Regra:** SEC-11 nunca altera SEC-01→10.

---

## Componentes

| Engine | Ficheiro |
|--------|----------|
| Adaptive Protection | `engine/adaptiveProtectionEngine.js` |
| Protection Profiles | `engine/protectionProfileService.js` |
| Surface Manager | `engine/adaptiveSurfaceManager.js` |
| Anti-Scanner | `engine/antiScannerService.js` |
| Runtime Shield | `engine/runtimeShieldService.js` |
| Approval | `engine/administratorApprovalService.js` |
| Recovery | `engine/recoveryPlanner.js` |

---

## DTO

`adaptive_protection_v1` — dashboard consolidado read-only.

---

## SEC-12

Execução controlada de medidas aprovadas — fase posterior.
