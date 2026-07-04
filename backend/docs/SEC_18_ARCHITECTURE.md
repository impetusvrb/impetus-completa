# SEC-18 — Arquitectura

```
SEC-02→04, SEC-10→17 (read-only)
         │
         ▼
 runtimeProtectionEngine
         │
   ┌─────┴─────┬──────────┬───────────┬────────────┐
   ▼           ▼          ▼           ▼            ▼
Profile    Risk Engine  Planner   Safety      Approval
Manager                              Validator  Coordinator
         │
         ▼
  runtime_protection_v1
         ▼
GET /api/audit/security-runtime-protection
```

## Próximo

**SEC-19** — Pentest operacional · **SEC-20** — Enterprise Security v2 Certification
