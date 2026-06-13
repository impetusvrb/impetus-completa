# AIOI-P1K — Deployment Governance

**Data:** 2026-06-13  
**Camada:** `AIOI_DEPLOYMENT_GOVERNANCE`  
**Veredito:** `AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiDeploymentGovernanceService.js`

| Função | Descrição |
|--------|-----------|
| `evaluateDeploymentEligibility()` | Elegibilidade formal (P1J + aprovação) |
| `validateProductionRequirements()` | Requisitos P1J/P1I/P1H |
| `conductRolloutAudit()` | Auditoria consolidada de rollout |
| `generateDeploymentGovernanceStatus()` | Snapshot completo |

---

## Resultado típico (sem aprovação)

```json
{
  "eligible": false,
  "blocking_items": [{ "code": "APPROVAL_REQUIRED" }],
  "warnings": [],
  "approval_required": true
}
```

## Resultado pós-aprovação manual

```json
{
  "eligible": true,
  "blocking_items": [],
  "approval_required": true,
  "auto_deploy": false
}
```

---

## API

```
GET /api/aioi/production/deployment
```

**READ ONLY** — nenhuma auto-ativação.
