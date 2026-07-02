# Etapa 389 — Tela: SelectTeamMember

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 389 / 1060 |
| **Rota** | `/app/equipe-operacional` |
| **Componente** | `./pages/SelectTeamMember` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `SelectTeamMember` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, ColaboradorRouteGuard

## Perfis

todos exceto colaborador-simples restrito

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/equipe-operacional`.

## Evidências

- `backend/docs/evidence/screens/Core/SelectTeamMember/`

---
*Etapa 389 · ICEB auto-gen*
