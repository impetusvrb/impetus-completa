# AIOI_PLAN_VS_IMPLEMENTATION_MATRIX

**Auditoria:** AIOI_MASTER_FORENSIC_IMPLEMENTATION_AUDIT  
**Data:** 2026-06-09  
**Modo:** READ ONLY ABSOLUTO  
**Referência:** AIOI_ARCHITECTURE_TARGET_FORENSIC_01 + AIOI_ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN

---

## Legenda

| Classificação | Significado |
|--------------|-------------|
| **IMPLEMENTADO** | Código existe, fase certificada, testes PASS |
| **IMPLEMENTADO COM DESVIOS** | Implementado, mas com diferença estrutural menor vs plano |
| **PARCIAL** | Parte do entregável existe; falta componente crítico |
| **NÃO IMPLEMENTADO** | Previsto no plano, ainda não criado |

---

## 1. Governança Arquitetural (AIOI-GOV-01)

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| AIOI_SOVEREIGNTY_MAP | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_SOVEREIGNTY_MAP.md | 9 domínios mapeados |
| AIOI_INTEGRATION_CATALOG | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_INTEGRATION_CATALOG.md | 10 módulos catalogados |
| AIOI_IOE_SPECIFICATION | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_IOE_SPECIFICATION.md | Schema, ENUMs, contratos |
| AIOI_BUS_ARCHITECTURE | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_BUS_ARCHITECTURE.md | Outbox PG aprovado |
| AIOI_ANTI_DUPLICATION_POLICY | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_ANTI_DUPLICATION_POLICY.md | 15 riscos catalogados |
| AIOI_STRUCTURAL_READINESS | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_STRUCTURAL_READINESS.md | FK, RLS, setores: READY |
| AIOI_P0_AUTHORIZATION | GOV-01 | **IMPLEMENTADO** | backend/docs/AIOI_P0_AUTHORIZATION.md | P0_AUTHORIZED_WITH_RESTRICTIONS |

---

## 2. AIOI-P0 — Fundação IOE

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Migration `industrial_operational_events` + RLS | P0-1 | **IMPLEMENTADO** | backend/migrations/aioi_ioe_foundation_migration.sql (509 linhas) | RLS + UNIQUE idempotency |
| Migration `aioi_outbox` + RLS | P0-1 | **IMPLEMENTADO** | backend/migrations/aioi_outbox_foundation_migration.sql (284 linhas) | SKIP LOCKED |
| `industrialOperationalEvent.schema.js` | P0-2 | **IMPLEMENTADO COM DESVIOS** | aioiEventIngestionService.js valida ENUMs inline | Schema não é arquivo separado em `backend/src/aioi/schemas/`; validação embutida |
| Adapter `plc_telemetry` (wrap F47) | P0-3 | **IMPLEMENTADO** | backend/src/services/aioi/plcAioiAdapter.js | Soberania `operationalPrioritizationService` respeitada |
| Adapter `communication` | P0-4 | **IMPLEMENTADO** | backend/src/services/aioi/communicationAioiAdapter.js | — |
| Adapter `work_order` / `task` | P0-5/P0-6 | **IMPLEMENTADO** | backend/src/services/aioi/taskAioiAdapter.js | work_order + task consolidados |
| Adapter `mes_erp` | P0-x | **IMPLEMENTADO** | backend/src/services/aioi/mesAioiAdapter.js | Além do plano original P0 |
| `aioi_outbox` + publisher + worker SKIP LOCKED | P0-7 | **IMPLEMENTADO** | aioiOutboxConsumerService.js + classificationConsumer.js | — |
| `classificationEngine` (cascata) | P0-8 | **IMPLEMENTADO** | aioiClassificationMapper.js | — |
| `criticalityEngine` | P0-9 | **IMPLEMENTADO COM DESVIOS** | Integrado no consumer/decision bridge | Não é arquivo separado `criticalityEngine.js` |
| `priorityEngine` (merge F47 PLC) | P0-10 | **IMPLEMENTADO COM DESVIOS** | Soberania via `operationalPrioritizationService` delegada no adapter | Não é arquivo `priorityEngine.js`; conforme política soberania |
| `GET /api/aioi/queue` + snapshot CEO | P0-11 | **PARCIAL** | aioiCockpitApiService.js + aioiCockpitRoutes.js existem | Queue API como rota ativa isolada não verificada; cockpit API implementada |
| Bloco React fila CEO (DS Industrial 4.0) | P0-12 | **PARCIAL** | ExecutiveCockpitPage.jsx existe; fila live CEO não verificada | Portal executivo construído via P5.4–P8.0 |
| Testes adapter PLC→IOE, idempotency | P0-13 | **IMPLEMENTADO** | backend/src/tests/aioi/aioiAdapterLayer.test.js | — |
| Bridge `ioe.created` → W2 | P0-14 | **NÃO IMPLEMENTADO** | Não identificado | Previsto como opcional P0; risco MEDIUM |
| `backend/src/aioi/` (estrutura pasta) | Plano | **IMPLEMENTADO COM DESVIOS** | Código em `backend/src/services/aioi/` | Funcional; diferença apenas organizacional |

---

## 3. AIOI-P0.4/P0.5 — Decision Bridge + HITL

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| `decisionEngine` + `aioi_policies` (shadow) | P1-dec | **IMPLEMENTADO** | aioiDecisionBridgeService.js (P0.4) | Shadow mode; HITL obrigatório |
| HITL Approval Layer | P0.5 | **IMPLEMENTADO** | aioiApprovalService.js + aioiApprovalAuditService.js | — |

---

## 4. AIOI-P1 — Execução, Outcomes, Learning, Hardening

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| `executionOrchestrator` → Action Runtime / tools | P1 | **IMPLEMENTADO** | aioiExecutionBridgeService.js (P1.0) | Delega ao orquestrador existente |
| `aioi_outcomes` + hook fecho OS/tarefa | P1.1 | **IMPLEMENTADO** | aioiOutcomeTrackingService.js | — |
| `operationalLearningService` estendido | P1.2 | **IMPLEMENTADO** | aioiLearningBridgeService.js | Bridge, não substituição |
| Lifecycle audit + snapshot | P1.3 | **IMPLEMENTADO** | aioiLifecycleAuditService.js + aioiLifecycleSnapshotService.js | — |
| Persistence hardening migration | P1.4 | **IMPLEMENTADO** | aioi_persistence_hardening_migration.sql | — |
| Redis BullMQ (se lag > threshold) | P1+ | **NÃO IMPLEMENTADO** | Não identificado no repositório | Depende de métricas lag P0 |

---

## 5. AIOI-P2 — Executive Intelligence Read Model (P2.0–P2.9)

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Executive read model (bottleneck, snapshot, ops) | P2.0 | **IMPLEMENTADO** | 5 serviços P2.0 | PASS |
| Governance/Risk/SLA intelligence | P2.1 | **IMPLEMENTADO** | 5 serviços P2.1 | PASS |
| Predictive intelligence (forecasts) | P2.2 | **IMPLEMENTADO** | 5 serviços P2.2 | PASS |
| Maturity intelligence | P2.3 | **IMPLEMENTADO** | 5 serviços P2.3 | PASS |
| Strategic intelligence | P2.4 | **IMPLEMENTADO** | 5 serviços P2.4 | PASS |
| Value realization | P2.5 | **IMPLEMENTADO** | 4 serviços P2.5 | PASS |
| Resilience intelligence | P2.6 | **IMPLEMENTADO** | 4 serviços P2.6 | PASS |
| Scenario intelligence | P2.7 | **IMPLEMENTADO** | 5 serviços P2.7 | PASS |
| Digital twin | P2.8 | **IMPLEMENTADO** | 3 serviços P2.8 | PASS |
| Command intelligence | P2.9 | **IMPLEMENTADO** | 3 serviços P2.9 | PASS |
| `mesMetricsService` + `aioi_kpi_snapshots` | P1 | **PARCIAL** | mesAioiAdapter.js existe; kpi_snapshots não verificado isolado | Depende de tenant MES activo |
| Heatmap setor × categoria | P1 | **NÃO IMPLEMENTADO** | Não identificado como componente dedicado | Pode estar embutido em cockpit |
| WebSocket refresh fila | P2 | **NÃO IMPLEMENTADO** | Não identificado | Previsto P2 |

---

## 6. AIOI-P3 — Enterprise Intelligence Governance (P3.0–P3.9)

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Trust (P3.0) | P3.0 | **IMPLEMENTADO** | aioiTrustReadModelService.js | PASS |
| Assurance/Explainability (P3.1) | P3.1 | **IMPLEMENTADO** | aioiAssuranceReadModelService.js | PASS |
| Auditability (P3.2) | P3.2 | **IMPLEMENTADO** | aioiAuditabilityReadModelService.js | PASS |
| Readiness/Adoption (P3.3) | P3.3 | **IMPLEMENTADO** | aioiReadinessReadModelService.js | PASS |
| Value Governance (P3.4) | P3.4 | **IMPLEMENTADO** | aioiValueGovernanceReadModelService.js | PASS |
| Sustainability (P3.5) | P3.5 | **IMPLEMENTADO** | aioiSustainabilityReadModelService.js | PASS |
| Certification (P3.6) | P3.6 | **IMPLEMENTADO** | aioiCertificationReadModelService.js | PASS |
| Conformance (P3.7) | P3.7 | **IMPLEMENTADO** | aioiConformanceReadModelService.js | PASS |
| Governance Excellence (P3.8) | P3.8 | **IMPLEMENTADO** | aioiGovernanceExcellenceReadModelService.js | PASS |
| Institutionalization (P3.9) | P3.9 | **IMPLEMENTADO** | aioiInstitutionalizationReadModelService.js | PASS |

---

## 7. AIOI-P4 — Sovereignty, Autonomy, Consumption, Visualization

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Sovereignty layer (P4.0) | P4.0 | **IMPLEMENTADO** | 6 serviços P4.0 | PASS |
| Autonomy layer (P4.1) | P4.1 | **IMPLEMENTADO** | 6 serviços P4.1 | PASS |
| Consumption layer (P4.2) | P4.2 | **IMPLEMENTADO** | 5 serviços P4.2 | PASS |
| Visualization readiness (P4.3) | P4.3 | **IMPLEMENTADO** | 6 serviços P4.3 | PASS |
| Executive Cockpit Read Model (P4.4) | P4.4 | **IMPLEMENTADO** | 4 serviços P4.4 | PASS |
| Decision Visualization Model (P4.5) | P4.5 | **IMPLEMENTADO** | 7 serviços P4.5 | PASS |
| Interface Intelligence Model (P4.6) | P4.6 | **IMPLEMENTADO** | 5 serviços P4.6 | PASS |

---

## 8. AIOI-P5 — Executive API/UI (Backend P5.0–P5.3 + Frontend P5.4–P5.9)

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Cockpit API layer (P5.0) | P5.0 | **IMPLEMENTADO** | aioiCockpitApiService.js + routes + controller | PASS |
| Executive Query Layer (P5.1) | P5.1 | **IMPLEMENTADO** | 5 serviços P5.1 | PASS |
| Executive UI Contract Layer (P5.2) | P5.2 | **IMPLEMENTADO** | 5 serviços P5.2 | PASS |
| Executive View Model Layer (P5.3) | P5.3 | **IMPLEMENTADO** | 5 serviços P5.3 + routes/controller | PASS |
| Executive Cockpit UI Foundation (P5.4) | P5.4 | **IMPLEMENTADO** | executive-cockpit/ | PASS |
| Executive Portal Layer (P5.5) | P5.5 | **IMPLEMENTADO** | executive-portal/ | PASS |
| Decision Visualization UI (P5.6) | P5.6 | **IMPLEMENTADO** | decision-visualization/ | PASS |
| Interface Intelligence UI (P5.7) | P5.7 | **IMPLEMENTADO** | interface-intelligence/ | PASS |
| Executive Reports UI (P5.8) | P5.8 | **IMPLEMENTADO** | executive-reports/ | PASS |
| Portal Consolidation (P5.9) | P5.9 | **IMPLEMENTADO** | executive-portal/tests/ExecutivePortalConsolidation | PASS |

---

## 9. AIOI-P6 — Router, Access, Navigation, Workspace

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Router Integration (P6.0) | P6.0 | **IMPLEMENTADO** | router/ | PASS |
| Access Governance (P6.1) | P6.1 | **IMPLEMENTADO** | access/ | PASS |
| Navigation Experience (P6.2) | P6.2 | **IMPLEMENTADO** | navigation/ | PASS |
| Deep Linking (P6.3) | P6.3 | **IMPLEMENTADO** | deep-linking/ | PASS |
| Workspace Layer (P6.4) | P6.4 | **IMPLEMENTADO** | workspace/ (385 testes PASS) | PASS |
| Workspace Certification Hardening (P6.4.1) | P6.4.1 | **IMPLEMENTADO** | workspace/tests/ExecutiveWorkspaceHardeningFixtures.js | PASS |
| Workspace Preferences (P6.5) | P6.5 | **IMPLEMENTADO** | workspace/ExecutiveWorkspacePreferences* | PASS |
| Session Experience (P6.6) | P6.6 | **IMPLEMENTADO** | session/ | PASS |
| Favorites (P6.7) | P6.7 | **IMPLEMENTADO** | favorites/ | PASS |
| Workspace Shortcuts (P6.8) | P6.8 | **IMPLEMENTADO** | shortcuts/ | PASS |
| Operational Certification (P6.9) | P6.9 | **IMPLEMENTADO** | P69OperationalCertificationAudit.js | PASS |

---

## 10. AIOI-P7 — Executive Intelligence Platform

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Intelligence Foundation (P7.0) | P7.0 | **IMPLEMENTADO** | intelligence/ (701 testes) | PASS |
| Intelligence Governance (P7.1) | P7.1 | **IMPLEMENTADO** | intelligence-governance/ (751 testes) | PASS |
| Activation Framework (P7.2) | P7.2 | **IMPLEMENTADO** | intelligence-activation/ (801 testes) | PASS |
| Capability Contracts (P7.3) | P7.3 | **IMPLEMENTADO** | intelligence-contracts/ (851 testes) | PASS |
| Insights Foundation (P7.4) | P7.4 | **IMPLEMENTADO** | intelligence-insights/ (901 testes) | PASS |
| Recommendations Foundation (P7.5) | P7.5 | **IMPLEMENTADO** | intelligence-recommendations/ (951 testes) | PASS |
| Assistant Foundation (P7.6) | P7.6 | **IMPLEMENTADO** | intelligence-assistant/ (1001 testes) | PASS |

---

## 11. AIOI-P8 — Cognitive Runtime

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| Cognitive Runtime Foundation (P8.0) | P8.0 | **IMPLEMENTADO** | cognitive-runtime/ (1051 testes) | PASS |
| Runtime Governance (P8.1) | P8.1 | **NÃO IMPLEMENTADO** | — | Próxima fase |
| Runtime Authorization (P8.2) | P8.2 | **NÃO IMPLEMENTADO** | — | Bloqueado por P8.1 |
| Runtime Audit Layer (P8.3) | P8.3 | **NÃO IMPLEMENTADO** | — | Bloqueado por P8.2 |
| Insights Runtime (P8.4) | P8.4 | **NÃO IMPLEMENTADO** | — | Bloqueado por P8.1–P8.3 |
| Recommendations Runtime (P8.5) | P8.5 | **NÃO IMPLEMENTADO** | — | Bloqueado |
| Assistant Runtime (P8.6) | P8.6 | **NÃO IMPLEMENTADO** | — | Bloqueado |

---

## 12. AIOI-P3 — Learning/IA (plano original)

| ITEM DO PLANO | FASE PREVISTA | STATUS REAL | EVIDÊNCIA | OBSERVAÇÕES |
|---------------|---------------|-------------|-----------|-------------|
| `aioi_weight_versions` + proposta admin | P3 original | **NÃO IMPLEMENTADO** | — | Aguarda volume + F49 |
| IA rerank / sugestão template | P3 original | **NÃO IMPLEMENTADO** | — | Bloqueado F49 Gemini + ≥10k IOE |
| Admin UI regras classificação/políticas | P2 | **NÃO IMPLEMENTADO** | — | Previsto P2 |
| Workflow AIOI end-to-end | P2 | **NÃO IMPLEMENTADO** | — | workflowOrchestrator existe; AIOI bridge não |
| SLA engine + escalation automático | P2 | **NÃO IMPLEMENTADO** | — | — |

---

*AIOI_PLAN_VS_IMPLEMENTATION_MATRIX — modo READ ONLY ABSOLUTO — nenhum arquivo alterado.*
