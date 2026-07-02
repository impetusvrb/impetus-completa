# Etapa 941 — Endpoint: POST /api/enterprise-locale/currency/convert

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 941 / 1060 |
| **Método** | POST |
| **Path** | `/api/enterprise-locale/currency/convert` |
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
*Etapa 941 · ICEB auto-gen*
