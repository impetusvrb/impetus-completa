# Etapa 347 — Tela: RegistroInteligente

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 347 / 1060 |
| **Rota** | `/app/registro-inteligente` |
| **Componente** | `./pages/RegistroInteligente` |
| **Módulo** | Core |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `RegistroInteligente` — FIX jsonb INSERT — invalid input syntax for type json; serialização serializeJsonbParam.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/registro-inteligente`.

## Evidências

- `backend/docs/evidence/cert01/CERT-REGISTRO_INTELIGENTE_JSONB_FIX.md`

---
*Etapa 347 · ICEB auto-gen*
