# Governed rollout (Etapa 6)

## Controlos

- `qualityGovernanceRolloutControl.js` — dependências entre flags (ex.: cognitive requer governance runtime; telemetry requer ingest WAVE3).
- Workflow gating em `qualityWorkflowRolloutEngine.js` alinhado com maturidade e blockers.

## Princípio

Nenhuma activação irreversível automática: API devolve **pacotes explicáveis**; operador/gestão ajusta flags de plataforma.

## Audit

`qualityRolloutAuditEnvelope.js` para recomendações assistivas ligadas a recomendações cognitivas (reutilizável).
