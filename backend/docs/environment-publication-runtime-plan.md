# ENVIRONMENT — Publication Runtime (Etapa 6)

## Objectivo

Publicar o domínio **ENVIRONMENT** no ecossistema enterprise IMPETUS em modo **SHADOW**: audience contextual, RBAC por capability, navigation runtime, rollout governado — sem FULL rollout nem publicação global.

## Arquitectura

| Camada | Local |
|--------|--------|
| Backend publication | `backend/src/domains/environment/publication/` |
| Backend navigation (API) | `backend/src/domains/environment/navigation/` |
| Frontend publication-runtime | `frontend/src/domains/environment/publication-runtime/` |
| Frontend navigation (menu) | `frontend/src/domains/environment/navigation/` |
| Pipeline sidebar | `quality → safety → logistics → environment` em `Layout.jsx` |

## Flags (shadow)

**Backend:** `IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED`, `IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED`, `IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE`, `IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED`

**Frontend:** `VITE_IMPETUS_ENVIRONMENT_NAVIGATION_ENABLED`, `VITE_IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED`, `VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_VISIBILITY_ENABLED`, `VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_VISIBILITY_ENABLED`, `VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_VISIBILITY_ENABLED`

## APIs

- `GET /api/environment-navigation/context` — contexto de publicação (com enrich audience/capabilities)
- `GET /api/environment-activation/readiness` — readiness shadow
- `POST /api/environment-operational-validation/pack` — pack enterprise

## Testes

```bash
cd backend && npm run test:environment-publication-runtime
cd frontend && npm run test:environment-publication-runtime
```

## Não-objectivos

Sem alteração estrutural a `App.jsx`, sem FULL rollout, sem enforcement automático, sem IA autónoma.
