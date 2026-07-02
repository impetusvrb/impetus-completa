# Etapa 362 — Tela: CentroCustosExecutivo

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 362 / 1060 |
| **Rota** | `/app/centro-custos-industriais` |
| **Componente** | `./pages/CentroCustosExecutivo` |
| **Módulo** | Custos/Billing |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `CentroCustosExecutivo` — IECP-01.4: tela estática ou probes não mapeados — validar manualmente.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/centro-custos-industriais`.

## Evidências

- FUNCTIONAL_MATRIX.json

---
*Etapa 362 · ICEB auto-gen*
