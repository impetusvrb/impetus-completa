# AIOI-P1J — Operational Risk

**Data:** 2026-06-13  
**Camada:** `AIOI_OPERATIONAL_RISK`  
**Veredito:** `AIOI_P1J_ENTERPRISE_PRODUCTION_READINESS_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiOperationalRiskService.js`

Avaliação **observacional only** — sem mitigação automática.

---

## Resultados (2026-06-13)

```json
{
  "runtime_risk": "LOW",
  "capacity_risk": "LOW",
  "recovery_risk": "LOW",
  "governance_risk": "LOW",
  "overall_risk": "LOW",
  "auto_mitigation": false
}
```

---

## Critérios de classificação

| Domínio | CRITICAL quando |
|---------|-----------------|
| Runtime | Invariantes violados |
| Capacity | Headroom CRITICAL |
| Recovery | Eventos lost > 0 |
| Governance | Cadeia de certificação quebrada |

> `capacity_guard_status: CRITICAL` (snapshots P1C) é observação — não eleva risco operacional automaticamente.

---

## API

```
GET /api/aioi/production/risk
```
