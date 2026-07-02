# Etapa 955 — Endpoint: GET /api/aioi/runtime/health

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 955 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/runtime/health` |
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
*Etapa 955 · ICEB auto-gen*
