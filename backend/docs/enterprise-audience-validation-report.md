# Enterprise Audience Validation — Relatório

**Motor:** `EnterpriseAudienceValidationRuntime`

## Regras

- Operadores **não** recebem governança executiva
- Diretores recebem visão estratégica (sem `missing_strategic_dashboard`)
- Técnicos: visão híbrida quando licenciado
- Auditoria isolada (sem cross-domain leak)

## Falhas típicas

`visibility_leak_executive_to_operator` · `excessive_visibility` · `publication_mismatch_unlicensed`

## Métrica observability

`audience_validation_failures`

## Decisão

Se `failure_rate > 0.25` → **ADJUST_AUDIENCE**
