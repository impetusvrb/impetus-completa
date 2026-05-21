# Sidebar Pipeline Trace

## Ordem canónica (backend → frontend)

1. identity → hierarchy → domain → authority  
2. legacy_modules (dashboardAccessService)  
3. contextual_modules (enrich — **risco reinjection**)  
4. Z.2 contextual activation → Z.3 pilot → Z.13 real → Z.14 canonical  
5. Response `visible_modules` + `sidebar_governance_runtime`  
6. Frontend: buildHybridMenu → safeMerge* → sidebarGovernanceAdapter → render  

## Maior risco

`safeMergeSafetyPublicationIntoMenu` — injecta menu SST se `safety_intelligence` ∈ visible_modules. Com Z.14, `denied_publications` bloqueia merge no Layout.

## Diagnóstico

Ver `delivery_governance_trace.sidebar_pipeline.reinjection_points` no `/dashboard/me`.
