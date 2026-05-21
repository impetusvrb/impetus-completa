# Legacy Injection Conflicts

## Injectors que podem reinjectar módulos negados

| Injector | Camada | Risco |
|----------|--------|-------|
| contextual_modules enrich | backend | Alto |
| safeMergeSafetyPublicationIntoMenu | frontend | **Crítico** |
| safeMergeEnvironmentPublicationIntoMenu | frontend | Alto |
| buildHybridMenu | frontend | Médio |
| precisionDelivery / contextualDelivery | backend | Médio |

## Resolução Z.14+Z.15

1. Backend remove de `visible_modules` e `contextual_modules`  
2. `denied_publications` no payload  
3. Layout bloqueia safeMerge*  
4. sidebarGovernanceAdapter filtra itens `_safety_publication`  

## Relatório

`GET /api/internal/runtime-delivery-audit/legacy`  
`delivery_pipeline_report.highest_risk_components`
