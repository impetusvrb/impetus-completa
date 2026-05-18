# Environment Cognitive Runtime — Plano (Etapa 4)

## Objetivo

Runtime de **inteligência ambiental contextual** — predição, correlação, recomendações, explainability e narrativas — **assistivo**, shadow-first.

## Camadas

| Camada | Path |
|--------|------|
| Backend | `backend/src/domains/environment/cognitive/` |
| API | `/api/environment-cognitive` |
| Frontend | `frontend/src/domains/environment/cognitive-runtime/` |

## Flags

- `IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED`
- `IMPETUS_ENVIRONMENT_PREDICTION_ENABLED`
- `IMPETUS_ENVIRONMENT_CROSS_DOMAIN_CORRELATION_ENABLED`
- `IMPETUS_ENVIRONMENT_CONTEXTUAL_RECOMMENDATIONS_ENABLED`
- `IMPETUS_ENVIRONMENT_EXPLAINABILITY_ENABLED`
- `IMPETUS_ENVIRONMENT_NARRATIVES_ENABLED`
- `IMPETUS_ENVIRONMENT_COGNITIVE_PUBLISH_EVENTS_ENABLED`

## Princípios

- Sem IA autónoma, sem PLC, sem bloqueio operacional
- Eventos `environment.cognitive.*` no catálogo industrial
- Throttle por tenant no orquestrador

## Testes

`npm run test:environment-cognitive-runtime`
