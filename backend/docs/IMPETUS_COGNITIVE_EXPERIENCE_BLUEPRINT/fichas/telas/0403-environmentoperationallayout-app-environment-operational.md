# Etapa 403 — Tela: EnvironmentOperationalLayout

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 403 / 1060 |
| **Rota** | `/app/environment/operational` |
| **Componente** | `./domains/environment/routes/EnvironmentOperationalLayout.jsx` |
| **Módulo** | ESG |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `EnvironmentOperationalLayout` — Emissão / Resíduo / Consumo.

## Guards

PrivateRoute, SetupGuard, ColaboradorRouteGuard, FactoryTeamMemberGate, Suspense, PageLoader

## Perfis

todos exceto colaborador-simples restrito

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/environment/operational`.

## Evidências

- `backend/docs/evidence/esg/emission-waste-consumption/`

---
*Etapa 403 · ICEB auto-gen*
