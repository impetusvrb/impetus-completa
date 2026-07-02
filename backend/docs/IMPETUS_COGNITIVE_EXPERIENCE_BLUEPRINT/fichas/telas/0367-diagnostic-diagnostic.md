# Etapa 367 — Tela: Diagnostic

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 367 / 1060 |
| **Rota** | `/diagnostic` |
| **Componente** | `./pages/Diagnostic` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `Diagnostic` — IECP-01.4: tela estática ou probes não mapeados — validar manualmente.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/diagnostic`.

## Evidências

- FUNCTIONAL_MATRIX.json

---
*Etapa 367 · ICEB auto-gen*
