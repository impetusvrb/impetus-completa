# ENVIRONMENT — Audience Runtime

## Bandas

| Audiência | Visibilidade principal |
|-----------|------------------------|
| Operador ambiental | ETA/ETE, água, campo, telemetria operacional |
| Técnico ambiental | Resíduos, compliance, emissões, inspeções |
| Coordenador | ESG, sustentabilidade, telemetria, cognitivo |
| Diretoria | Carbono, executive cockpit, governança, rollout |

## Resolvers

- Backend: `publication/environmentAudienceResolver.js`
- Frontend: `navigation/environmentAudienceNavigation.js`

Validação enterprise: `enterpriseAudienceValidationRuntime` via `environmentAudienceRuntime`.

## Teste

```bash
npm run test:environment-audience-validation
```
