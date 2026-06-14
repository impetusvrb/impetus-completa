# AIOI-P1M — Authorization Policy

**Data:** 2026-06-13  
**Camada:** `AIOI_AUTHORIZATION_POLICY`  
**Veredito:** `AIOI_P1M_ENTERPRISE_RUNTIME_AUTHORIZATION_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiAuthorizationPolicyService.js`

---

## Políticas definidas

| Scope | Approvals | Tipo | Dependências |
|-------|-----------|------|--------------|
| `continuous_runtime` | 1 | manual | P1A, P1B |
| `horizontal_activation` | 2 | manual | P1E, P1F, P1G |
| `distributed_runtime` | 2 | manual | P1H, P1J |
| `enterprise_rollout` | 3 | manual | P1K, P1L |

Exemplo:

```json
{
  "scope": "distributed_runtime",
  "required_approvals": 2,
  "approval_type": "manual",
  "auto_authorize": false
}
```

---

## API

```
GET /api/aioi/authorization/policies
```
