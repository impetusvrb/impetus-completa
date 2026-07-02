# Etapa 990 — Endpoint: GET /api/aioi/authorization/status

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 990 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/authorization/status` |
| **Mount** | `/api/aioi/authorization` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiAuthorizationPolicyService, ../../services/aioi/runtime/aioiRuntimeAuthorizationRegistryService, ../../services/aioi/runtime/aioiAuthorizationAuditService, ../../services/aioi/runtime/aioiAuthorizationGovernanceService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 990 · ICEB auto-gen*
