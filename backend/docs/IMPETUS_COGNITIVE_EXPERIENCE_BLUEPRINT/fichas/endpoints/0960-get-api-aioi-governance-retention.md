# Etapa 960 — Endpoint: GET /api/aioi/governance/retention

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 960 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/governance/retention` |
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
*Etapa 960 · ICEB auto-gen*
