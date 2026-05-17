# IMPETUS — Universal Occupational Safety Management Core (SST/EHS)

## Arquitetura enterprise (espelho QUALITY)

O domínio **safety** (SST/EHS) nasce com os 7 runtimes obrigatórios:

| Runtime | Backend | Frontend |
|---------|---------|----------|
| Operational | `/api/safety-operational` | `SafetyOperationalShell`, workspace |
| Governance | `/api/safety-governance` | `SafetyGovernanceHub`, matriz de risco |
| Telemetry | `/api/safety-telemetry` | `SafetyTelemetryHub` |
| Cognitive | `/api/safety-cognitive` | `SafetyCognitiveHub` |
| Rollout | `/api/safety-rollout` | `SafetyRolloutHub` |
| Publication | flags + navigation service | `safeMergeSafetyPublicationIntoMenu` |
| Navigation | `/api/safety-navigation` | `SafetyRuntimePublicationGate` |

## Publication runtime

- Manifesto: `frontend/src/domains/safety/navigation/safetyNavigationManifest.js`
- Audiência: `safetyAudienceNavigation.js` (operator, coordinator, director, auditor, sst_technician, production)
- Merge defensivo: `safeMergeSafetyPublicationIntoMenu` — nunca encolhe menu legacy
- Layout: pipeline try/catch global (QUALITY + SST em cadeia)
- Framework partilhado: `shared/domain-publication/*.cjs`

## Feature flags (default OFF)

**Backend:** `IMPETUS_SAFETY_*_RUNTIME_ENABLED`, `IMPETUS_SAFETY_ACTIVATION_STAGE`  
**Frontend:** `VITE_IMPETUS_SAFETY_*`

## Ativação controlada

1. `GET /api/safety-activation/safe-checks`
2. `POST /api/safety-activation/shadow-preview`
3. Activar flags por estágio: shadow → pilot → canary → staged → full
4. `npm run build` + `pm2 reload impetus-frontend --update-env`
5. `pm2 reload impetus-backend --update-env` (se flags backend)

## Rollback

Desactivar flags SST sem restart destrutivo. Publication OFF → menu legacy intacto.

## Testes

- `npm run test:safety-publication-runtime` (frontend)
- `npm run test:safety-publication-activation` (backend)

## Referências

- `backend/docs/domain-publication-framework.md`
- `backend/docs/enterprise-runtime-evolution-roadmap.md`
- `backend/docs/enterprise-industrial-risk-matrix.md`
