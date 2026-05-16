# Quality — Executive Runtime (narrativa & explainability)

## Objectivo

Transformar sinais industriais em **texto explicativo** e **frames de governança** respeitando **bounded cognition**: poucos bullets, narrativa curta, sem decisão autónoma.

## Módulos

- `qualityExecutiveExplainability.js` — frame alinhado a `qualityExplainabilityLayer`.
- `qualityNarrativeComposer.js` — composição de frases.
- `qualityExecutiveInsights.js` — insights a partir de SPC, Pareto textual, tendência.
- `qualityContextualStorytelling.js` — história contextual única.

## API

`POST /api/quality-governance/intelligence/narrative` com `IMPETUS_QUALITY_EXECUTIVE_EXPLAINABILITY_ENABLED=true`.  
Opcional `emit_insight_event: true` → `quality.executive.insight_generated`.

## IA

`qualityContextualAiAssistant.js` / `qualityGovernanceAiHooks.js` / `qualityOperationalInsightEngine.js` limitam-se a texto **non_authoritative** e eventos `quality.cognitive.operational_hint` quando `IMPETUS_QUALITY_AI_ASSISTANCE_ENABLED=true`.

## Frontend

Hub executivo condicionado a `VITE_IMPETUS_QUALITY_EXECUTIVE_DASHBOARDS_ENABLED` + chamadas API com flag backend de explainability.

## Rollback

Desligar flags executivas e de IA; narrativas deixam de ser geradas; operacional permanece intacto.
