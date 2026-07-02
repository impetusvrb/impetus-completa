# Etapa 472 — Endpoint: GET /api/auth/mfa/policy

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 472 / 1060 |
| **Método** | GET |
| **Path** | `/api/auth/mfa/policy` |
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
*Etapa 472 · ICEB auto-gen*
