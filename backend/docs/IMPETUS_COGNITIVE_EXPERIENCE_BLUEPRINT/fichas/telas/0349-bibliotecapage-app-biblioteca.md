# Etapa 349 — Tela: BibliotecaPage

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 349 / 1060 |
| **Rota** | `/app/biblioteca` |
| **Componente** | `./features/biblioteca/BibliotecaPage` |
| **Módulo** | Biblioteca |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `BibliotecaPage` — IECP probe OK: 403.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/biblioteca`.

## Evidências

- `backend/docs/evidence/screens/Biblioteca/BibliotecaPage/`

---
*Etapa 349 · ICEB auto-gen*
