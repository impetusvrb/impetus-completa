# Quality — Cognitive Industrial Intelligence Runtime (Etapa 5)

## Âmbito

Runtime **bounded** ao domínio Quality: motores estatísticos assistivos (sem ML pesado, sem LLM) que **antecipam**, **explicam** e **sugerem**. Não executa workflows, não aprova CAPA/NCR, não altera parâmetros industriais.

## Flags (backend, default `false`)

- `IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED` — mestre; API `/api/quality-cognitive`.
- `IMPETUS_QUALITY_DRIFT_PREDICTION_ENABLED`
- `IMPETUS_QUALITY_RECURRENCE_ANALYSIS_ENABLED`
- `IMPETUS_QUALITY_SUPPLIER_SCORING_ENABLED`
- `IMPETUS_QUALITY_ANOMALY_PREDICTION_ENABLED`
- `IMPETUS_QUALITY_PROCESS_DETERIORATION_ENABLED`
- `IMPETUS_QUALITY_CONTEXTUAL_RECOMMENDATIONS_ENABLED`
- `IMPETUS_QUALITY_EXECUTIVE_NARRATIVES_ENABLED`
- `IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED` — publicação opcional no backbone industrial.

Frontend (Vite): prefixo `VITE_IMPETUS_QUALITY_*` espelhando os motores.

## API tenant

- `GET /api/quality-cognitive/health`
- `POST /api/quality-cognitive/insights/run` — corpo `{ signals, emit_events?, correlation_id?, ... }`

## Contrato

`qualityDomainContract` v6 — eventos `quality.cognitive.*` listados em `EVENTS` e no `industrialEventCatalog`.

## Rollback

Desligar `IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED`. Sem impacto em governança, backbone ou observability **core** (apenas métricas `recordMetric` aditivas).
