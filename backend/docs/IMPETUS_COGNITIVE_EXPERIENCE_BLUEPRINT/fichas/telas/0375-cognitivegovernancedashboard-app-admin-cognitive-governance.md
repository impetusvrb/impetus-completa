# Etapa 375 — Tela: CognitiveGovernanceDashboard

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 375 / 1060 |
| **Rota** | `/app/admin/cognitive-governance` |
| **Componente** | `./pages/admin/CognitiveGovernanceDashboard` |
| **Módulo** | Admin |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `CognitiveGovernanceDashboard` — IECP probe OK: 403.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard, StrictAdminRouteGuard

## Perfis

admin (strict)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/admin/cognitive-governance`.

## Evidências

- `backend/docs/evidence/screens/Admin/CognitiveGovernanceDashboard/`

---
*Etapa 375 · ICEB auto-gen*
