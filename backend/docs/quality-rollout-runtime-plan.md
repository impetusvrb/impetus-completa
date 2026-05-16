# Quality — Controlled Enterprise Rollout Runtime (Etapa 6)

## Âmbito

Runtime **assistivo** para planeamento e fiscalização de activação progressiva (tenant / planta / workflow), com maturidade, readiness, adoção e anti-saturação — **sem** auto-enable nem decisões autónomas.

## Flags (backend, default `false`)

- `IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED` — mestre.
- `IMPETUS_QUALITY_TENANT_ROLLOUT_ENABLED`
- `IMPETUS_QUALITY_PLANT_ROLLOUT_ENABLED`
- `IMPETUS_QUALITY_WORKFLOW_ROLLOUT_ENABLED`
- `IMPETUS_QUALITY_MATURITY_SCORING_ENABLED`
- `IMPETUS_QUALITY_ADOPTION_ANALYTICS_ENABLED`
- `IMPETUS_QUALITY_SATURATION_PROTECTION_ENABLED`
- `IMPETUS_QUALITY_READINESS_ENGINE_ENABLED`
- `IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED` — eventos industriais opcionais.

Frontend: `VITE_IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED`.

## API (`/api/quality-rollout`)

- `GET /health`
- `GET /snapshot/memory` — estado em memória do processo (opcional; não substitui CMDB).
- `POST /assessment/run` — `snapshot` declarativo + `emit_events`, `persist_state` (memória).

## Contrato

`qualityDomainContract` **v7** — eventos `quality.rollout.*`.

## Rollback

Desligar `IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED`. Memória de estado volta ao vazio ao reiniciar processo.
