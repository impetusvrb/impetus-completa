# ENVIRONMENT — Enterprise Runtime Alignment

Domínio **Ambiental / SGA-EHS** alinhado ao padrão QUALITY · SAFETY · LOGISTICS.

## Estado

- `status: shadow` em `domainRegistry.js`
- Flags `IMPETUS_ENVIRONMENT_*` / `VITE_IMPETUS_ENVIRONMENT_*`
- Sem auto-promoção para FULL

## APIs

| Rota | Função |
|------|--------|
| `GET /api/environment-navigation/context` | Publication context |
| `GET /api/environment-activation/readiness` | Activation / rollout |
| `POST /api/environment-operational-validation/pack` | Pack enterprise + correlação |

## Camadas

1. **Operations** — ETA/ETE, água, emissões, resíduos, campo
2. **Governance** — ESG, telemetria, inteligência, rollout

## Cross-domain

- `environmentCrossDomainCorrelationRuntime`
- `environmentOperationalCorrelationEngine`
- `environmentCognitiveCorrelationEngine`

## Testes (Etapa 6 — publication)

```bash
cd backend && npm run test:environment-publication-runtime
cd backend && npm run test:environment-shadow-stabilization
cd frontend && npm run test:environment-publication-runtime
```

Ver também: `backend/docs/environment-publication-runtime-plan.md`, `environment-shadow-activation-deploy.md`.

## Pipeline sidebar

`quality → safety → logistics → environment` via `safeMergeEnvironmentPublicationIntoMenu`.
