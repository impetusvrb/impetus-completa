# Frontend Governance Audit

`frontend/src/runtimeGovernanceAudit/`

- `sidebarRenderAudit.js` — divergência menu vs backend  
- `moduleInjectionAudit.js` — injectors e ordem  
- `governanceConflictAudit.js` — conflitos publication merge  
- `deliveryOrderAudit.js` — ordem de execução  

Activar debug cliente: `window.IMPETUS_FRONTEND_GOVERNANCE_AUDIT = true`

Integrado em `sidebarGovernanceAdapter` (sem alterar CSS).
