# Cognitive governance (Quality Etapa 5)

## Princípios

- **Assistivo apenas:** recomendações com `human_acceptance_required`, sem promotion de autoridade.
- **Auditável:** `qualityCognitiveAuditEnvelope` por recomendação; eventos com `correlation_id`.
- **Multi-tenant:** `company_id` da sessão; sem dados cruzados entre tenants.
- **WAVE 4:** uso não bloqueante de `resolveBudget`; pressão de orçamento incrementa métrica `quality_cognitive_budget_pressure_total`.

## Integração industrial

Publicação só com `IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED` + pipeline industrial do cliente (`IMPETUS_INDUSTRIAL_EVENTS_ENABLED`). `featureGovernanceService` regista avisos de combinação inválida.

## Anti-padrões proibidos

Aprovação automática de CAPA, fecho de NCR, alteração de parâmetros de processo pela IA — **fora de âmbito** por construção.
