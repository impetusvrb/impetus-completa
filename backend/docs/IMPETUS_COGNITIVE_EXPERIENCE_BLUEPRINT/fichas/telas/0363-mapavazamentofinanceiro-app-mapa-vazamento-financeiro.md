# Etapa 363 — Tela: MapaVazamentoFinanceiro

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 363 / 1060 |
| **Rota** | `/app/mapa-vazamento-financeiro` |
| **Componente** | `./pages/MapaVazamentoFinanceiro` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `MapaVazamentoFinanceiro` — IECP-01.4: tela estática ou probes não mapeados — validar manualmente.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/mapa-vazamento-financeiro`.

## Evidências

- FUNCTIONAL_MATRIX.json

---
*Etapa 363 · ICEB auto-gen*
