# Etapa 1046 — Endpoint: GET /api/operations/golive/24h

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 1046 / 1060 |
| **Método** | GET |
| **Path** | `/api/operations/golive/24h` |
| **Mount** | `/api/operations/golive` |
| **Classificação** | AB |

## Serviço candidato

../../services/operations/goLiveDetectionService, ../../services/operations/firstDayMonitoringService, ../../services/operations/threeDayMonitoringService, ../../services/operations/productionAcceptanceService, ../../services/operations/goLiveRegistryService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 1046 · ICEB auto-gen*
