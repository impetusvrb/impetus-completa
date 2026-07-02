# Etapa 963 — Endpoint: GET /api/aioi/scale/workers

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 963 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/scale/workers` |
| **Mount** | `/api/aioi/scale` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiTenantRegistryService, ../../services/aioi/runtime/aioiTenantPartitionService, ../../services/aioi/runtime/aioiWorkerCoordinationService, ../../services/aioi/runtime/aioiParallelExecutionService, ../../services/aioi/runtime/aioiContinuousWorkerService, ../../services/aioi/runtime/aioiCapacityGuardService, ../../services/aioi/runtime/aioiHorizontalValidationMetricsService, ../../services/aioi/runtime/aioiHorizontalActivationService, ../../services/aioi/runtime/aioiDistributedRuntimeService, ../../services/aioi/runtime/aioiDistributedTelemetryService, ../../services/aioi/runtime/aioiDistributedAuditService, ../../services/aioi/runtime/aioiClusterHealthService, ../../services/aioi/runtime/aioiDistributedCapacityService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 963 · ICEB auto-gen*
