# Etapa 956 — Endpoint: GET /api/aioi/runtime/metrics

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 956 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/runtime/metrics` |
| **Mount** | `/api/aioi/runtime` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiContinuousWorkerService, ../../services/aioi/runtime/aioiRuntimeMetricsService, ../../services/aioi/aioiPilotFlags

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 956 · ICEB auto-gen*
