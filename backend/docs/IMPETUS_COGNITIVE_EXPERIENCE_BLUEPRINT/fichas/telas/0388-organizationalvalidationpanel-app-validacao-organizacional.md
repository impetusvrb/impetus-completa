# Etapa 388 — Tela: OrganizationalValidationPanel

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 388 / 1060 |
| **Rota** | `/app/validacao-organizacional` |
| **Componente** | `./pages/OrganizationalValidationPanel` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `OrganizationalValidationPanel` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, RoleGuard

## Perfis

internal_admin, diretor, gerente, coordenador, supervisor, ceo

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/validacao-organizacional`.

## Evidências

- `backend/docs/evidence/screens/Core/OrganizationalValidationPanel/`

---
*Etapa 388 · ICEB auto-gen*
