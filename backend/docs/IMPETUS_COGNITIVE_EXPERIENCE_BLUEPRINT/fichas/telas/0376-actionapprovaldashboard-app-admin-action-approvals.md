# Etapa 376 — Tela: ActionApprovalDashboard

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 376 / 1060 |
| **Rota** | `/app/admin/action-approvals` |
| **Componente** | `./components/actionRuntime/ActionApprovalDashboard` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `ActionApprovalDashboard` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard, StrictAdminRouteGuard

## Perfis

admin (strict)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/admin/action-approvals`.

## Evidências

- `backend/docs/evidence/screens/Core/ActionApprovalDashboard/`

---
*Etapa 376 · ICEB auto-gen*
