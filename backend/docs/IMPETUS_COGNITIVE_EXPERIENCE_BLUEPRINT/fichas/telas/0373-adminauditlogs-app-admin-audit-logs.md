# Etapa 373 — Tela: AdminAuditLogs

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 373 / 1060 |
| **Rota** | `/app/admin/audit-logs` |
| **Componente** | `./pages/AdminAuditLogs` |
| **Módulo** | Admin |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `AdminAuditLogs` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard, StrictAdminRouteGuard

## Perfis

admin (strict)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/admin/audit-logs`.

## Evidências

- `backend/docs/evidence/screens/Admin/AdminAuditLogs/`

---
*Etapa 373 · ICEB auto-gen*
