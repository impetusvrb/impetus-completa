# Runtime Governance Entrypoint Map

Generated: 2026-05-19T18:51:13.364Z

## Summary

- Total entrypoints: 13
- Governed: 4
- Shadow-only: 8
- Gaps: 1

## Catalog

| ID | Route | Channel | Classification | Module |
|----|-------|---------|----------------|--------|
| dashboard_kpis | GET /dashboard/kpis | kpi | shadow_only | routes/dashboard.js |
| dashboard_smart_summary | GET /dashboard/smart-summary | summary | shadow_only | routes/dashboard.js |
| dashboard_chat | POST /dashboard/chat | chat | shadow_only | routes/dashboard.js |
| dashboard_visibility | GET /dashboard/visibility | dashboard | governed | routes/dashboard.js |
| cognitive_facade | internal | multi | shadow_only | policyEngine/cognitiveGovernanceFacade.js |
| secure_chat_builder | internal | chat | shadow_only | policyEngine/channels/secureChatContextBuilder.js |
| secure_kpi_resolver | internal | kpi | shadow_only | policyEngine/channels/secureKpiExposureResolver.js |
| summary_sanitizer | internal | summary | shadow_only | policyEngine/channels/summaryExposureSanitizer.js |
| boundary_guard | internal | boundary | shadow_only | policyEngine/cognitiveBoundaryGuard.js |
| unified_exposure | internal | dashboard | governed | policyEngine/unifiedExposureResolver.js |
| context_sanitizer | internal | contextual | governed | security/contextExposureSanitizer.js |
| manutencao_ia | POST /manutencao-ia/* | ia | unknown | routes/manutencao-ia |
| internal_governance | /api/internal/governance/* | ops | governed | routes/internal/cognitiveGovernance* |

## Coverage gaps

- **manutencao_ia**: POST /manutencao-ia/* (unknown)