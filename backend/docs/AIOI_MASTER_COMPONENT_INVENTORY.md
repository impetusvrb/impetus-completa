# AIOI_MASTER_COMPONENT_INVENTORY

**Auditoria:** AIOI_MASTER_FORENSIC_IMPLEMENTATION_AUDIT  
**Data:** 2026-06-09  
**Modo:** READ ONLY ABSOLUTO  
**Escopo:** Todos os artefatos AIOI no repositório `/var/www/impetus-completa`

---

## 1. Resumo Quantitativo

| Camada | Arquivos | Status |
|--------|---------|--------|
| Backend — Serviços AIOI | 213 | IMPLEMENTADO |
| Backend — Testes AIOI | 40 | IMPLEMENTADO |
| Backend — Controllers AIOI | 2 | IMPLEMENTADO |
| Backend — Routes AIOI | 2 | IMPLEMENTADO |
| Backend — Adapters AIOI | 4 | IMPLEMENTADO |
| Backend — Migrations AIOI | 3 | IMPLEMENTADO |
| Frontend — Módulos AIOI | 201 arquivos / 22 módulos | IMPLEMENTADO |
| Documentação governance | 8 | IMPLEMENTADO |
| Relatórios de fase backend | 32 | IMPLEMENTADO |
| Relatórios de fase frontend | 28 | IMPLEMENTADO |
| **Total geral** | **~530 artefatos** | |

---

## 2. Inventário Backend — Adapters (P0.2)

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| plcAioiAdapter.js | Adapter | P0.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| communicationAioiAdapter.js | Adapter | P0.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| mesAioiAdapter.js | Adapter | P0.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| taskAioiAdapter.js | Adapter | P0.2 | backend/src/services/aioi/ | IMPLEMENTADO |

---

## 3. Inventário Backend — Serviços Core P0

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioiEventIngestionService.js | Service | P0.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiClassificationMapper.js | Service | P0.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| classificationConsumer.js | Consumer | P0.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOutboxConsumerService.js | Consumer | P0.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiConsumerMetrics.js | Metrics | P0.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionBridgeService.js | Service | P0.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionPayloadBuilder.js | Builder | P0.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionMetrics.js | Metrics | P0.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiApprovalService.js | Service | P0.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiApprovalAuditService.js | Service | P0.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiApprovalMetrics.js | Metrics | P0.5 | backend/src/services/aioi/ | IMPLEMENTADO |

---

## 4. Inventário Backend — P1 Intelligence

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioiExecutionBridgeService.js | Service | P1.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutionPayloadBuilder.js | Builder | P1.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutionMetrics.js | Metrics | P1.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOutcomeTrackingService.js | Service | P1.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOutcomeAlignmentService.js | Service | P1.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOutcomePayloadBuilder.js | Builder | P1.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOutcomeMetrics.js | Metrics | P1.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiLearningBridgeService.js | Service | P1.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiLearningPayloadBuilder.js | Builder | P1.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiLearningMetrics.js | Metrics | P1.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiLifecycleAuditService.js | Service | P1.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiLifecycleSnapshotService.js | Service | P1.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiLifecycleMetrics.js | Metrics | P1.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAuditPersistenceService.js | Service | P1.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiMetricsSnapshotService.js | Service | P1.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiPersistenceMetrics.js | Metrics | P1.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiProcessingHistoryService.js | Service | P1.4 | backend/src/services/aioi/ | IMPLEMENTADO |

---

## 5. Inventário Backend — P2 Executive Intelligence Read Model

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioiExecutiveReadModelService.js | Read Model | P2.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveSnapshotService.js | Snapshot | P2.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiBottleneckAnalysisService.js | Analysis | P2.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCycleAnalyticsService.js | Analytics | P2.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOperationalViewService.js | View | P2.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceReadModelService.js | Read Model | P2.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceCoverageService.js | Coverage | P2.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiRiskAnalysisService.js | Analysis | P2.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSlaIntelligenceService.js | Intelligence | P2.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiTenantHealthService.js | Health | P2.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiTrendAnalysisService.js | Analysis | P2.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiPredictiveGovernanceReadModelService.js | Read Model | P2.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiBacklogForecastService.js | Forecast | P2.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCapacityForecastService.js | Forecast | P2.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiRiskForecastService.js | Forecast | P2.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSlaForecastService.js | Forecast | P2.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveMaturityReadModelService.js | Read Model | P2.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiBenchmarkAnalysisService.js | Analysis | P2.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceConsistencyService.js | Consistency | P2.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiMaturityAnalysisService.js | Analysis | P2.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOperationalStabilityService.js | Stability | P2.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicReadModelService.js | Read Model | P2.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveFocusService.js | Focus | P2.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiImprovementOpportunityService.js | Opportunity | P2.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicAlignmentService.js | Alignment | P2.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicMetrics.js | Metrics | P2.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiValueReadModelService.js | Read Model | P2.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiValueSustainabilityService.js | Sustainability | P2.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOperationalValueService.js | Value | P2.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiValueMetrics.js | Metrics | P2.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiResilienceReadModelService.js | Read Model | P2.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOperationalResilienceService.js | Resilience | P2.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiResilienceScenarioService.js | Scenario | P2.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiRecoveryReadinessService.js | Readiness | P2.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiScenarioReadModelService.js | Read Model | P2.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiScenarioStateService.js | State | P2.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiBacklogReductionScenarioService.js | Scenario | P2.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCapacityExpansionScenarioService.js | Scenario | P2.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSlaRecoveryScenarioService.js | Scenario | P2.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDigitalTwinReadModelService.js | Read Model | P2.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiTwinConsistencyService.js | Consistency | P2.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiModelConsistencyService.js | Consistency | P2.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveCommandReadModelService.js | Read Model | P2.9 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveCommandStateService.js | State | P2.9 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutivePriorityMatrixService.js | Matrix | P2.9 | backend/src/services/aioi/ | IMPLEMENTADO |

---

## 6. Inventário Backend — P3 Enterprise Intelligence Governance

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioiTrustReadModelService.js | Read Model | P3.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiTrustMetrics.js | Metrics | P3.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAssuranceReadModelService.js | Read Model | P3.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInsightExplainabilityService.js | Explainability | P3.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExplainabilityMetrics.js | Metrics | P3.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAuditabilityReadModelService.js | Read Model | P3.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAuditabilityMetrics.js | Metrics | P3.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEvidenceAnalysisService.js | Analysis | P3.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEvidenceChainService.js | Chain | P3.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiReadinessReadModelService.js | Read Model | P3.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiReadinessMetrics.js | Metrics | P3.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAdoptionAnalysisService.js | Analysis | P3.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAccreditationCoverageService.js | Coverage | P3.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiValueGovernanceReadModelService.js | Read Model | P3.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiValueGovernanceMetrics.js | Metrics | P3.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiOutcomeAlignmentService.js | Alignment | P3.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSustainabilityReadModelService.js | Read Model | P3.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSustainabilityAnalysisService.js | Analysis | P3.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSustainabilityMetrics.js | Metrics | P3.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCertificationReadModelService.js | Read Model | P3.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCertificationMetrics.js | Metrics | P3.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCertificationReadinessService.js | Readiness | P3.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiConformanceReadModelService.js | Read Model | P3.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiConformanceMetrics.js | Metrics | P3.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStandardsCoverageService.js | Coverage | P3.7 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceExcellenceReadModelService.js | Read Model | P3.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceExcellenceMetrics.js | Metrics | P3.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceExcellenceCoverageService.js | Coverage | P3.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExcellenceGovernanceConsistencyService.js | Consistency | P3.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceMaturityService.js | Maturity | P3.8 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInstitutionalizationReadModelService.js | Read Model | P3.9 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInstitutionalizationCoverageService.js | Coverage | P3.9 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernancePersistenceService.js | Persistence | P3.9 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiGovernanceStabilityService.js | Stability | P3.9 | backend/src/services/aioi/ | IMPLEMENTADO |

---

## 7. Inventário Backend — P4 Sovereignty & Visualization

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioiSovereigntyReadModelService.js | Read Model | P4.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseSovereigntyService.js | Sovereignty | P4.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSovereigntyCoverageService.js | Coverage | P4.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInstitutionalResilienceService.js | Resilience | P4.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiKnowledgeIndependenceService.js | Independence | P4.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSovereigntyMetrics.js | Metrics | P4.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAutonomyReadModelService.js | Read Model | P4.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseAutonomyService.js | Autonomy | P4.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAutonomyCoverageService.js | Coverage | P4.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiKnowledgeAutonomyService.js | Autonomy | P4.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiSovereigntyContinuityService.js | Continuity | P4.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiAutonomyMetrics.js | Metrics | P4.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiConsumptionReadModelService.js | Read Model | P4.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseConsumptionService.js | Consumption | P4.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionConsumptionService.js | Consumption | P4.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveVisibilityService.js | Visibility | P4.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiConsumptionMetrics.js | Metrics | P4.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiVisualizationReadModelService.js | Read Model | P4.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseVisualizationReadinessService.js | Readiness | P4.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutivePresentationService.js | Presentation | P4.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiVisualizationConsistencyService.js | Consistency | P4.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiVisualizationCoverageService.js | Coverage | P4.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiVisualizationMetrics.js | Metrics | P4.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveCockpitReadModelService.js | Read Model | P4.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseCockpitReadinessService.js | Readiness | P4.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveSummaryService.js | Summary | P4.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicOverviewService.js | Overview | P4.4 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionVisualizationReadModelService.js | Read Model | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseDecisionVisualizationService.js | Visualization | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionConsistencyService.js | Consistency | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionPerspectiveService.js | Perspective | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionVisualizationCoverageService.js | Coverage | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionTraceabilityService.js | Traceability | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionVisualizationMetrics.js | Metrics | P4.5 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInterfaceIntelligenceReadModelService.js | Read Model | P4.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiEnterpriseInterfaceIntelligenceService.js | Intelligence | P4.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInterfacePerspectiveService.js | Perspective | P4.6 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiInterfaceIntelligenceMetrics.js | Metrics | P4.6 | backend/src/services/aioi/ | IMPLEMENTADO |

---

## 8. Inventário Backend — P5 Executive API/Query/ViewModel

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioiCockpitApiService.js | API | P5.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCockpitApiMetrics.js | Metrics | P5.0 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveQueryService.js | Query | P5.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveSummaryQuery.js | Query | P5.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicOverviewQuery.js | Query | P5.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionVisualizationQuery.js | Query | P5.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveQueryMetrics.js | Metrics | P5.1 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiUiContractService.js | UI Contract | P5.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveSummaryUiContract.js | UI Contract | P5.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicOverviewUiContract.js | UI Contract | P5.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionVisualizationUiContract.js | UI Contract | P5.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiUiContractMetrics.js | Metrics | P5.2 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveViewModelService.js | View Model | P5.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveSummaryViewModel.js | View Model | P5.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiStrategicOverviewViewModel.js | View Model | P5.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiDecisionVisualizationViewModel.js | View Model | P5.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiExecutiveViewModelMetrics.js | Metrics | P5.3 | backend/src/services/aioi/ | IMPLEMENTADO |
| aioiCockpitRoutes.js | Route | P5.0 | backend/src/routes/aioi/ | IMPLEMENTADO |
| aioiExecutiveCockpitViewModelRoutes.js | Route | P5.3 | backend/src/routes/aioi/ | IMPLEMENTADO |
| aioiCockpitController.js | Controller | P5.0 | backend/src/controllers/aioi/ | IMPLEMENTADO |
| aioiExecutiveCockpitViewModelController.js | Controller | P5.3 | backend/src/controllers/aioi/ | IMPLEMENTADO |

---

## 9. Inventário Backend — Migrations

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| aioi_ioe_foundation_migration.sql | Migration | P0.1 | backend/migrations/ | IMPLEMENTADO |
| aioi_outbox_foundation_migration.sql | Migration | P0.1 | backend/migrations/ | IMPLEMENTADO |
| aioi_persistence_hardening_migration.sql | Migration | P1.4 | backend/migrations/ | IMPLEMENTADO |

---

## 10. Inventário Backend — Estrutura backend/src/aioi/

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| backend/src/aioi/ (schemas, adapters, bus, classification, etc.) | Pasta estrutural | P0 (plano) | backend/src/ | **AUSENTE** |

> **Nota forense:** O `AIOI_ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN.md` prevê a estrutura `backend/src/aioi/` como local canônico futuro. O código atual está em `backend/src/services/aioi/` (padrão IMPETUS existente). Não é defeito — é desvio de organização de pasta sem impacto funcional.

---

## 11. Inventário Frontend — Módulos AIOI

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| access/ (Guard, Policy, Validator, GovernanceService) | Access Layer | P6.1 | frontend/src/modules/aioi/access/ | IMPLEMENTADO |
| cognitive-runtime/ (Service, Context, Provider, Indicators, CSS) | Runtime Foundation | P8.0 | frontend/src/modules/aioi/cognitive-runtime/ | IMPLEMENTADO |
| decision-visualization/ (Page, Container, Cards, Gateway, ViewModel) | Decision UI | P5.6 | frontend/src/modules/aioi/decision-visualization/ | IMPLEMENTADO |
| deep-linking/ (Registry, Resolver, Guard, ModuleRoute) | Deep Linking | P6.3 | frontend/src/modules/aioi/deep-linking/ | IMPLEMENTADO |
| executive-cockpit/ (Page, Container, Cards, Gateway, ViewModel) | Cockpit UI | P5.4 | frontend/src/modules/aioi/executive-cockpit/ | IMPLEMENTADO |
| executive-portal/ (Page, Layout, Header, Sidebar, Navigation, Validators) | Portal UI | P5.5 | frontend/src/modules/aioi/executive-portal/ | IMPLEMENTADO |
| executive-reports/ (Page, Container, Cards, Gateway, ViewModel) | Reports UI | P5.8 | frontend/src/modules/aioi/executive-reports/ | IMPLEMENTADO |
| favorites/ (Service, Context, Provider, Indicators) | Workspace Layer | P6.7 | frontend/src/modules/aioi/favorites/ | IMPLEMENTADO |
| intelligence/ (Service, Context, Provider, Metadata) | Intelligence Foundation | P7.0 | frontend/src/modules/aioi/intelligence/ | IMPLEMENTADO |
| intelligence-activation/ (Service, Context, Provider, Indicators) | Activation | P7.2 | frontend/src/modules/aioi/intelligence-activation/ | IMPLEMENTADO |
| intelligence-assistant/ (Service, Context, Provider, Indicators) | Assistant Foundation | P7.6 | frontend/src/modules/aioi/intelligence-assistant/ | IMPLEMENTADO |
| intelligence-contracts/ (Service, Context, Provider) | Capability Contracts | P7.3 | frontend/src/modules/aioi/intelligence-contracts/ | IMPLEMENTADO |
| intelligence-governance/ (Service, Context, Provider, Indicators) | Intelligence Governance | P7.1 | frontend/src/modules/aioi/intelligence-governance/ | IMPLEMENTADO |
| intelligence-insights/ (Service, Context, Provider, Indicators) | Insights Foundation | P7.4 | frontend/src/modules/aioi/intelligence-insights/ | IMPLEMENTADO |
| intelligence-recommendations/ (Service, Context, Provider, Indicators) | Recommendations Foundation | P7.5 | frontend/src/modules/aioi/intelligence-recommendations/ | IMPLEMENTADO |
| interface-intelligence/ (Page, Container, Cards, Gateway, ViewModel) | Interface Intelligence UI | P5.7 | frontend/src/modules/aioi/interface-intelligence/ | IMPLEMENTADO |
| navigation/ (Provider, Context, Model, Indicators, Breadcrumb) | Navigation | P6.2 | frontend/src/modules/aioi/navigation/ | IMPLEMENTADO |
| router/ (Route, Guard, Registry) | Router | P6.0 | frontend/src/modules/aioi/router/ | IMPLEMENTADO |
| session/ (Service, Context, Provider) | Session | P6.6 | frontend/src/modules/aioi/session/ | IMPLEMENTADO |
| shortcuts/ (Service, Context, Provider, Shortcuts) | Shortcuts | P6.8 | frontend/src/modules/aioi/shortcuts/ | IMPLEMENTADO |
| tests/ (ssrTestBundleUtils.cjs) | Test Utilities | P6+ | frontend/src/modules/aioi/tests/ | IMPLEMENTADO |
| workspace/ (Service, HealthService, Guard, Provider, Context, Model, Preferences) | Workspace Core | P6.4–P6.5 | frontend/src/modules/aioi/workspace/ | IMPLEMENTADO |

---

## 12. Inventário — Documentação de Governança

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO | STATUS |
|------------|------|------|-------------|--------|
| AIOI_GOVERNANCE_01_CERTIFICATION.md | Governance | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_P0_AUTHORIZATION.md | Authorization | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_SOVEREIGNTY_MAP.md | Sovereignty | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_INTEGRATION_CATALOG.md | Catalog | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_IOE_SPECIFICATION.md | Specification | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_BUS_ARCHITECTURE.md | Architecture | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_ANTI_DUPLICATION_POLICY.md | Policy | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |
| AIOI_STRUCTURAL_READINESS.md | Readiness | AIOI-GOV-01 | backend/docs/ | IMPLEMENTADO |

---

## 13. Componentes Ausentes (AUSENTE)

| COMPONENTE | TIPO | FASE | LOCALIZAÇÃO ESPERADA | STATUS |
|------------|------|------|---------------------|--------|
| backend/src/aioi/ (estrutura canônica) | Pasta estrutural | P0 plano | backend/src/ | AUSENTE (código em services/aioi/) |
| Queue API `/api/aioi/queue` ativa | Route/Controller | P0.11 | backend/src/routes/ | AUSENTE |
| Redis/BullMQ worker | Bus | P1+ | backend/ | AUSENTE (previsto P1+) |
| Admin UI regras classificação | UI | P2 | frontend/ | AUSENTE (previsto P2) |
| WebSocket refresh fila CEO | WS | P2 | backend/ | AUSENTE (previsto P2) |
| Kafka | Bus | P3 | backend/ | AUSENTE (previsto P3) |
| IA rerank | Cognitive | P3 | backend/ | AUSENTE (bloqueado F49/volume) |
| P8.1 Runtime Governance | Runtime | P8.1 | frontend/ | AUSENTE (próxima fase) |
| P8.2 Runtime Authorization | Runtime | P8.2 | frontend/ | AUSENTE |
| P8.3 Runtime Audit Layer | Runtime | P8.3 | frontend/ | AUSENTE |
| P8.4 Insights Runtime | Runtime | P8.4 | frontend/ | AUSENTE (bloqueado P8.1–P8.3) |
| P8.5 Recommendations Runtime | Runtime | P8.5 | frontend/ | AUSENTE (bloqueado) |
| P8.6 Assistant Runtime | Runtime | P8.6 | frontend/ | AUSENTE (bloqueado) |

---

*AIOI_MASTER_COMPONENT_INVENTORY — modo READ ONLY ABSOLUTO — nenhum arquivo alterado.*
