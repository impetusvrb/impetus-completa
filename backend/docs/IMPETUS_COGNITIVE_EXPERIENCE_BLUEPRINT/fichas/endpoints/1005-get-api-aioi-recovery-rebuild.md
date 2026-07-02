# Etapa 1005 — Endpoint: GET /api/aioi/recovery/rebuild

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 1005 / 1060 |
| **Método** | GET |
| **Path** | `/api/aioi/recovery/rebuild` |
| **Mount** | `/api/aioi/recovery` |
| **Classificação** | AB |

## Serviço candidato

../../services/aioi/runtime/aioiBaselineRecoveryGovernanceService, ../../services/aioi/runtime/aioiRecoveryChainService, ../../services/aioi/runtime/aioiCertificationRebuildService, ../../services/aioi/runtime/aioiBaselineContinuityService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 1005 · ICEB auto-gen*
