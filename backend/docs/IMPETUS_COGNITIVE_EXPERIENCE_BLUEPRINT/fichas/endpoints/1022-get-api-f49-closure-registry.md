# Etapa 1022 — Endpoint: GET /api/f49/closure/registry

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 1022 / 1060 |
| **Método** | GET |
| **Path** | `/api/f49/closure/registry` |
| **Mount** | `/api/f49/closure` |
| **Classificação** | AB |

## Serviço candidato

../../services/audit/truthProgramConsolidationService, ../../services/audit/truthProgramRegistryService, ../../services/audit/truthClosureReportService, ../../services/audit/truthFinalStatusService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 1022 · ICEB auto-gen*
