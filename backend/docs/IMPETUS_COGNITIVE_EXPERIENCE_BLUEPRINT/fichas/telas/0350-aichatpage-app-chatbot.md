# Etapa 350 — Tela: AIChatPage

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 350 / 1060 |
| **Rota** | `/app/chatbot` |
| **Componente** | `./features/aiChat/AIChatPage` |
| **Módulo** | Chat/IA |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `AIChatPage` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard

## Perfis

ceo, +demais (bloqueia colaborador simples)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/chatbot`.

## Evidências

- `backend/docs/evidence/screens/Chat/IA/AIChatPage/`

---
*Etapa 350 · ICEB auto-gen*
