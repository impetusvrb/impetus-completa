# Etapa 1010 — Endpoint: GET /api/aioi/release/readiness

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 1010 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/release/readiness` |
| **Mount** | `/api/aioi/release` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiReleaseGovernanceService, ../../services/aioi/runtime/aioiEnterpriseReleaseRegistryService, ../../services/aioi/runtime/aioiChangeGovernanceService, ../../services/aioi/runtime/aioiReleaseReadinessService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 1010 · ICEB auto-gen*
