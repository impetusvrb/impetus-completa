# AIOI-P1M — Runtime Authorization Registry

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1M_ENTERPRISE_RUNTIME_AUTHORIZATION_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiRuntimeAuthorizationRegistryService.js`

Registra **sem executar ações**:

- solicitações (`createAuthorizationRequest`)
- aprovações (`addApproval`)
- rejeições (`rejectAuthorizationRequest`)
- expirações (`expireAuthorizationRequest`)
- revogações (`revokeAuthorizationRequest`)

Estados: `PENDING` | `PARTIALLY_APPROVED` | `APPROVED` | `REJECTED` | `EXPIRED` | `REVOKED`

`runtime_authorized` permanece **false** — registro only.

---

## API

```
GET /api/aioi/authorization/requests
GET /api/aioi/authorization/status
```
