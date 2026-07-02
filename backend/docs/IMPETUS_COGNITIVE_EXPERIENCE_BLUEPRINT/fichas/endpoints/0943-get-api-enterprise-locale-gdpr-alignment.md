# Etapa 943 — Endpoint: GET /api/enterprise-locale/gdpr/alignment

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 943 / 1060 |
| **Método** | GET |
| **Path** | `/api/enterprise-locale/gdpr/alignment` |
| **Mount** | `/api/enterprise-locale` |
| **Classificação** | AB |

## Serviço candidato

../enterpriseLocale/services/multiCurrencyService, ../services/userAccountService

## Guards

requireAuth (mount), requireAuth, requireHierarchy(3)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 943 · ICEB auto-gen*
