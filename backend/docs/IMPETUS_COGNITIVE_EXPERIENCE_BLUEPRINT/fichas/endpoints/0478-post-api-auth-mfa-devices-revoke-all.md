# Etapa 478 — Endpoint: POST /api/auth/mfa/devices/revoke-all

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 478 / 1060 |
| **Método** | POST |
| **Path** | `/api/auth/mfa/devices/revoke-all` |
| **Mount** | `/api/auth/mfa` |
| **Classificação** | AB |

## Serviço candidato

../mfa/services/mfaChallengeService, ../mfa/services/totpMfaService, ../mfa/services/backupRecoveryService, ../mfa/services/webauthnMfaService, ../mfa/services/mfaPolicyService, ../mfa/services/deviceTrustService

## Guards

requireAuth

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 478 · ICEB auto-gen*
