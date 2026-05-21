# KPI Delivery Trace

Pipeline `/dashboard/kpis`:

1. `dashboardKPIs.getDashboardKPIs` (origem dados)  
2. Personalização  
3. cognitiveGovernance  
4. kpiRollout / precision / stabilization  
5. Z.5 kpiRuntimeEnforcement (piloto)  
6. Z.6 stability → Z.7 convergence  

Auditoria: `delivery_governance_trace.kpi_delivery_audit` — detecta KPIs executivos (faturamento, OEE) em perfis operacionais/coordenação.
