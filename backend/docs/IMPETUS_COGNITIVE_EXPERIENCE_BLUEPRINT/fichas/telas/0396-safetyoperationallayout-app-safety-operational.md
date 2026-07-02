# Etapa 396 — Tela: SafetyOperationalLayout

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 396 / 1060 |
| **Rota** | `/app/safety/operational` |
| **Componente** | `./domains/safety/routes/SafetyOperationalLayout.jsx` |
| **Módulo** | SST |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `SafetyOperationalLayout` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, ColaboradorRouteGuard, FactoryTeamMemberGate, Suspense, PageLoader

## Perfis

todos exceto colaborador-simples restrito

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/safety/operational`.

## Evidências

- `backend/docs/evidence/screens/SST/SafetyOperationalLayout/`

---
*Etapa 396 · ICEB auto-gen*
