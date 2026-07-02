# Etapa 979 — Endpoint: GET /api/aioi/production/deployment

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 979 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/production/deployment` |
| **Mount** | `/api/aioi/production` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiProductionReadinessService, ../../services/aioi/runtime/aioiOperationalRiskService, ../../services/aioi/runtime/aioiCertificationRegistryService, ../../services/aioi/runtime/aioiDeploymentGovernanceService, ../../services/aioi/runtime/aioiDeploymentApprovalService, ../../services/aioi/runtime/aioiProductionRolloutRegistryService, ../../services/aioi/runtime/aioiContinuousReadinessService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 979 · ICEB auto-gen*
