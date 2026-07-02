# Etapa 958 — Endpoint: GET /api/aioi/governance/status

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 958 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/governance/status` |
| **Mount** | `/api/aioi/governance` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiRuntimeAggregationService, ../../services/aioi/runtime/aioiCapacityGuardService, ../../services/aioi/lifecycle/aioiOutboxRetentionService, ../../services/aioi/lifecycle/aioiSnapshotRetentionService, ../../services/aioi/runtime/aioiContinuousWorkerService, ../../services/aioi/aioiPilotFlags

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 958 · ICEB auto-gen*
