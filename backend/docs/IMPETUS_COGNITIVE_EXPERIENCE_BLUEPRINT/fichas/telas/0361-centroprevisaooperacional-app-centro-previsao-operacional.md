# Etapa 361 — Tela: CentroPrevisaoOperacional

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 361 / 1060 |
| **Rota** | `/app/centro-previsao-operacional` |
| **Componente** | `./pages/CentroPrevisaoOperacional` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `CentroPrevisaoOperacional` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/centro-previsao-operacional`.

## Evidências

- `backend/docs/evidence/screens/Core/CentroPrevisaoOperacional/`

---
*Etapa 361 · ICEB auto-gen*
