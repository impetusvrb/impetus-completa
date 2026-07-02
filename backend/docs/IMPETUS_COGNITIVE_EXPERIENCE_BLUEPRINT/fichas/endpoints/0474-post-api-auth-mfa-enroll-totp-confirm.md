# Etapa 474 — Endpoint: POST /api/auth/mfa/enroll/totp/confirm

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 474 / 1060 |
| **Método** | POST |
| **Path** | `/api/auth/mfa/enroll/totp/confirm` |
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
*Etapa 474 · ICEB auto-gen*
