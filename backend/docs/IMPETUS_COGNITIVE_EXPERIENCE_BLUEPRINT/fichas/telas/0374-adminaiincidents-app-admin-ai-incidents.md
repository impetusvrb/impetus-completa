# Etapa 374 — Tela: AdminAiIncidents

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 374 / 1060 |
| **Rota** | `/app/admin/ai-incidents` |
| **Componente** | `./pages/AdminAiIncidents` |
| **Módulo** | Admin |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `AdminAiIncidents` — IECP probe OK: 401.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard, StrictAdminRouteGuard

## Perfis

admin (strict)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/admin/ai-incidents`.

## Evidências

- `backend/docs/evidence/screens/Admin/AdminAiIncidents/`

---
*Etapa 374 · ICEB auto-gen*
