# AIOI-P1K — Approval Framework

**Data:** 2026-06-13  
**Camada:** `AIOI_DEPLOYMENT_APPROVAL`  
**Veredito:** `AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiDeploymentApprovalService.js`

Estados: `PENDING` | `APPROVED` | `REJECTED` | `NONE`

```json
{
  "approval_status": "PENDING",
  "approved": false,
  "approved_by": null,
  "approved_at": null,
  "auto_approval": false
}
```

---

## Regras

- Nenhuma aprovação automática
- Nenhuma integração com IA
- `grantApproval()` exige `approved_by` explícito
- API exposta apenas em **GET** (leitura)

---

## Fluxo certificado

1. `requestApproval()` → PENDING  
2. `grantApproval({ approved_by })` → APPROVED (simulação manual)  
3. Elegibilidade de deployment passa a ser avaliada com aprovação

---

## API

```
GET /api/aioi/production/approval
GET /api/aioi/production/approval?approval_id=APR-...
```
