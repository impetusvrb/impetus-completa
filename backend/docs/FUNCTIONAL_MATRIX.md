# MATRIZ FUNCIONAL REAL — IMPETUS (geração automática)

> Gerado por `backend/scripts/audit/buildFunctionalMatrix.js` em 2026-06-21T21:15:23.724Z.
> **Read-only.** Status preliminares são ESTÁTICOS. `NAO_VALIDADO` = estrutura íntegra aguardando validação E2E (Parte 7 do manual). Nenhuma linha é VERDE sem evidência de execução.

## Resumo

- Telas/rotas mapeadas (frontend): **77**
- Endpoints mapeados (backend): **1097** em **142** mounts
- Endpoints referenciados pelo frontend (api.js): **617**
- Chamadas de API distintas no cliente (api.js): **780**
- Mounts não resolvidos: **0**

### Distribuição de status preliminar (telas)

| Status | Qtd |
|--------|-----|
| NAO_VALIDADO | 72 |
| REDIRECT | 5 |

## Telas por módulo

### Admin (15)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| AdminUsers | `/app/admin/users` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminDepartments | `/app/admin/departments` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminOperationalTeams | `/app/admin/equipes-operacionais` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminStructural | `/app/admin/structural` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminAuditLogs | `/app/admin/audit-logs` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminAiIncidents | `/app/admin/ai-incidents` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| CognitiveGovernanceDashboard | `/app/admin/cognitive-governance` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| RolloutCenterHub | `/app/admin/rollout-center` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| CertificationReadinessHub | `/app/admin/certification-readiness` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| FinalConsolidationHub | `/app/admin/final-consolidation` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminEquipmentLibrary | `/app/admin/equipment-library` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminAudioLogs | `/app/admin/audio-logs` | ceo, diretor | PrivateRoute › SetupGuard › DirectorOrCEORouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminIntegrations | `/app/admin/integrations` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminHelpCenter | `/app/admin/help-center` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminWarehouse | `/app/admin/warehouse` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |

### Biblioteca (1)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| BibliotecaPage | `/app/biblioteca` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |

### Chat/IA (2)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| AIChatPage | `/app/chatbot` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |
| ChatPage | `/chat` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |

### Core (30)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| Login | `/` | (sem guard explícito) |  | NAO_VALIDADO |  |
| ForgotPassword | `/forgot-password` | (sem guard explícito) |  | NAO_VALIDADO |  |
| ResetPassword | `/reset-password` | (sem guard explícito) |  | NAO_VALIDADO |  |
| SetupEmpresa | `/setup-empresa` | autenticado | PrivateRoute | NAO_VALIDADO | lazy-loaded |
| RoleVerificationPage | `/validacao-cargo` | autenticado | PrivateRoute | NAO_VALIDADO | lazy-loaded |
| Proposals | `/app/proacao` | autenticado | PrivateRoute › SetupGuard | NAO_VALIDADO | lazy-loaded |
| ProposalDetail | `/app/proacao/:id` | autenticado | PrivateRoute › SetupGuard | NAO_VALIDADO | lazy-loaded |
| Dashboard | `/app/ceo` | autenticado | PrivateRoute › SetupGuard › Navigate | NAO_VALIDADO | lazy-loaded |
| Operacional | `/app/operacional` | admin (strict) | PrivateRoute › SetupGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| RegistroInteligente | `/app/registro-inteligente` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard | NAO_VALIDADO | lazy-loaded |
| CadastrarComIA | `/app/cadastrar-com-ia` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |
| InsightsPage | `/app/insights` | autenticado | PrivateRoute › SetupGuard › Navigate | NAO_VALIDADO | lazy-loaded |
| OperationalIntelligencePanel | `/app/cerebro-operacional` | autenticado | PrivateRoute › SetupGuard › Navigate | NAO_VALIDADO | lazy-loaded |
| IndustrialOperationsCenter | `/app/centro-operacoes-industrial` | autenticado | PrivateRoute › SetupGuard › Navigate | NAO_VALIDADO | lazy-loaded |
| IndustrialOperationsCenter | `/app/monitored-points` | autenticado | PrivateRoute › SetupGuard › Navigate | NAO_VALIDADO | lazy-loaded |
| AlmoxarifadoInteligente | `/app/almoxarifado-inteligente` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |
| CentroPrevisaoOperacional | `/app/centro-previsao-operacional` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard | NAO_VALIDADO | lazy-loaded |
| MapaVazamentoFinanceiro | `/app/mapa-vazamento-financeiro` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard | NAO_VALIDADO | lazy-loaded |
| CompanyAdminSettings | `/app/admin/conteudo-empresa` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| Diagnostic | `/diagnostic` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |
| ImplementationGuide | `/app/admin/implantacao-guia` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| ActionApprovalDashboard | `/app/admin/action-approvals` | admin (strict) | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › StrictAdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| OrganizationalValidationPanel | `/app/validacao-organizacional` | internal_admin, diretor, gerente, coordenador, supervisor, ceo | PrivateRoute › SetupGuard › RoleGuard | NAO_VALIDADO | lazy-loaded |
| SelectTeamMember | `/app/equipe-operacional` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |
| UserSettings | `/app/settings` | autenticado | PrivateRoute › SetupGuard › SettingsAccessGuard | NAO_VALIDADO | lazy-loaded |
| AppMobile | `/m` | autenticado | PrivateRoute › SetupGuard | NAO_VALIDADO | lazy-loaded |
| LicenseExpired | `/license-expired` | (sem guard explícito) |  | NAO_VALIDADO | lazy-loaded |
| SubscriptionExpired | `/subscription-expired` | (sem guard explícito) |  | NAO_VALIDADO | lazy-loaded |
| Error404 | `/404` | (sem guard explícito) |  | NAO_VALIDADO | lazy-loaded |
| Error500 | `/500` | (sem guard explícito) |  | NAO_VALIDADO | lazy-loaded |

### Custos/Billing (3)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| CentroCustosExecutivo | `/app/centro-custos-industriais` | ceo, +demais (bloqueia colaborador simples) | PrivateRoute › SetupGuard › CEORouteGuard | NAO_VALIDADO | lazy-loaded |
| CentroCustosAdmin | `/app/admin/centro-custos` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| NexusIACustos | `/app/admin/nexusia-custos` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |

### Desconhecido (5)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| (redirect) | `/app` | autenticado | PrivateRoute › SetupGuard › Navigate › DashboardRouteEntry | REDIRECT |  |
| (redirect) | `/app/dashboard-vivo` | autenticado | PrivateRoute › SetupGuard › Navigate | REDIRECT |  |
| (redirect) | `/app/configuracoes` | (sem guard explícito) | Navigate | REDIRECT |  |
| (redirect) | `/proposals` | autenticado | PrivateRoute › SetupGuard › Navigate | REDIRECT |  |
| (redirect) | `/*` | (sem guard explícito) | Navigate | REDIRECT |  |

### ESG (3)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| EnvironmentOperationalLayout | `/app/environment/operational` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard › FactoryTeamMemberGate › Suspense › PageLoader | NAO_VALIDADO | layout com rotas filhas; exige membro de equipe operacional; lazy-loaded |
| EnvironmentOperationalWorkspacePage | `/app/environment/operational` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| EnvironmentOperationalWorkspacePage | `/app/environment/operational/workspace` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |

### Logistics (5)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| LogisticaInteligente | `/app/logistica-inteligente` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard | NAO_VALIDADO | lazy-loaded |
| AdminLogistics | `/app/admin/logistics` | admin | PrivateRoute › SetupGuard › CEORouteGuard › ColaboradorRouteGuard › AdminRouteGuard | NAO_VALIDADO | lazy-loaded |
| LogisticsOperationalLayout | `/app/logistics/operational` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard › FactoryTeamMemberGate › Suspense › PageLoader | NAO_VALIDADO | layout com rotas filhas; exige membro de equipe operacional; lazy-loaded |
| LogisticsOperationalWorkspacePage | `/app/logistics/operational` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| LogisticsOperationalWorkspacePage | `/app/logistics/operational/workspace` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |

### ManuIA (2)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| ManuIA | `/app/manutencao/manuia` | autenticado | PrivateRoute › SetupGuard | NAO_VALIDADO | lazy-loaded |
| ManuIAExtensionApp | `/app/manutencao/manuia-app` | autenticado | PrivateRoute › SetupGuard | NAO_VALIDADO | lazy-loaded |

### Pulse (2)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| PulseRh | `/app/pulse-rh` | rh, hr_management | PrivateRoute › SetupGuard › PulseRhRouteGuard | NAO_VALIDADO | lazy-loaded |
| PulseGestao | `/app/pulse-gestao` | diretor, gerente, coordenador, supervisor | PrivateRoute › SetupGuard › RoleGuard | NAO_VALIDADO | lazy-loaded |

### Quality (5)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| QualityOperationalLayout | `/app/quality/operational` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard › FactoryTeamMemberGate › Suspense › PageLoader | NAO_VALIDADO | layout com rotas filhas; exige membro de equipe operacional; lazy-loaded |
| QualityOperationalWorkspacePage | `/app/quality/operational` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| QualityOperationalWorkspacePage | `/app/quality/operational/workspace` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| QualityInspectionRuntimePage | `/app/quality/operational/inspection` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| QualityKioskRuntimePage | `/app/quality/operational/kiosk` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |

### SST (4)

| Tela | Rota | Perfil | Guards | Status | Observações |
|------|------|--------|--------|--------|-------------|
| SafetyOperationalLayout | `/app/safety/operational` | todos exceto colaborador-simples restrito | PrivateRoute › SetupGuard › ColaboradorRouteGuard › FactoryTeamMemberGate › Suspense › PageLoader | NAO_VALIDADO | layout com rotas filhas; exige membro de equipe operacional; lazy-loaded |
| SafetyOperationalWorkspacePage | `/app/safety/operational` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| SafetyOperationalWorkspacePage | `/app/safety/operational/workspace` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |
| SafetyFieldInspectionPage | `/app/safety/operational/inspection` | (sem guard explícito) | Suspense › PageLoader | NAO_VALIDADO | lazy-loaded |

## Catálogo de endpoints (backend)

| Método | Path | Auth | Arquivo de rota | Chamado pelo FE |
|--------|------|------|-----------------|-----------------|
| POST | `/api/action-runtime/approvals/:id/approve` | sim | routes/actionRuntime.js | sim |
| POST | `/api/action-runtime/approvals/:id/reject` | sim | routes/actionRuntime.js | sim |
| GET | `/api/action-runtime/approvals/pending` | sim | routes/actionRuntime.js | sim |
| GET | `/api/action-runtime/health` | sim | routes/actionRuntime.js | sim |
| POST | `/api/action-runtime/rollback/:traceId` | sim | routes/actionRuntime.js | sim |
| GET | `/api/action-runtime/traces` | sim | routes/actionRuntime.js | sim |
| GET | `/api/admin-portal/ai-governance/iso42001` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/ai-governance/models` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/ai-incidents` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/ai-incidents/:id` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/ai-incidents/metrics` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/ai-learning` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/compliance/advanced` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/compliance/overview` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/compliance/reports` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/policies` | NÃO | routes/adminPortalGovernance.js | — |
| POST | `/api/admin-portal/policies` | NÃO | routes/adminPortalGovernance.js | — |
| PUT | `/api/admin-portal/policies/:id` | NÃO | routes/adminPortalGovernance.js | — |
| DELETE | `/api/admin-portal/policies/:id` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/risk-intelligence/companies` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/risk-intelligence/overview` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/risk-intelligence/timeseries` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/risk-intelligence/users` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/security/encryption-status` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin-portal/system-health` | NÃO | routes/adminPortalGovernance.js | — |
| GET | `/api/admin/ai-audit` | NÃO | routes/admin/aiAudit.js | sim |
| GET | `/api/admin/ai-policies` | NÃO | routes/admin/aiPolicies.js | — |
| POST | `/api/admin/ai-policies` | NÃO | routes/admin/aiPolicies.js | — |
| PUT | `/api/admin/ai-policies/:id` | NÃO | routes/admin/aiPolicies.js | — |
| DELETE | `/api/admin/ai-policies/:id` | NÃO | routes/admin/aiPolicies.js | — |
| GET | `/api/admin/audio-logs` | sim | routes/admin/audioLogs.js | sim |
| GET | `/api/admin/departments` | NÃO | routes/admin/departments.js | sim |
| POST | `/api/admin/departments` | NÃO | routes/admin/departments.js | sim |
| GET | `/api/admin/departments/:id` | NÃO | routes/admin/departments.js | sim |
| PUT | `/api/admin/departments/:id` | NÃO | routes/admin/departments.js | sim |
| DELETE | `/api/admin/departments/:id` | NÃO | routes/admin/departments.js | sim |
| GET | `/api/admin/departments/stats/summary` | NÃO | routes/admin/departments.js | sim |
| GET | `/api/admin/departments/tree` | NÃO | routes/admin/departments.js | sim |
| GET | `/api/admin/equipes-operacionais` | NÃO | routes/admin/operationalTeams.js | sim |
| POST | `/api/admin/equipes-operacionais` | NÃO | routes/admin/operationalTeams.js | sim |
| GET | `/api/admin/equipes-operacionais/:id` | NÃO | routes/admin/operationalTeams.js | sim |
| PUT | `/api/admin/equipes-operacionais/:id` | NÃO | routes/admin/operationalTeams.js | sim |
| POST | `/api/admin/equipes-operacionais/:id/collective-user` | NÃO | routes/admin/operationalTeams.js | sim |
| POST | `/api/admin/equipes-operacionais/:id/members` | NÃO | routes/admin/operationalTeams.js | sim |
| PUT | `/api/admin/equipes-operacionais/:id/members/:memberId` | NÃO | routes/admin/operationalTeams.js | sim |
| DELETE | `/api/admin/equipes-operacionais/:id/members/:memberId` | NÃO | routes/admin/operationalTeams.js | sim |
| GET | `/api/admin/equipes-operacionais/exports/member-events` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/equipes-operacionais/exports/member-events.csv` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/equipes-operacionais/health/alerts` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/equipes-operacionais/reports/member-activity` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/equipes-operacionais/reports/team-activity` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/equipment-library/assets` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/assets` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/equipment-library/assets/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| PUT | `/api/admin/equipment-library/assets/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| DELETE | `/api/admin/equipment-library/assets/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/assets/:id/manual-pdf` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/assets/:id/model-3d` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/equipment-library/health` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/equipment-library/knowledge-documents` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/knowledge-documents` | NÃO | routes/admin/equipmentLibrary.js | sim |
| PUT | `/api/admin/equipment-library/knowledge-documents/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| DELETE | `/api/admin/equipment-library/knowledge-documents/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/equipment-library/references` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/equipment-library/spare-parts` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/spare-parts` | NÃO | routes/admin/equipmentLibrary.js | sim |
| PATCH | `/api/admin/equipment-library/spare-parts/:id/keywords` | NÃO | routes/admin/equipmentLibrary.js | sim |
| PATCH | `/api/admin/equipment-library/spare-parts/:id/validate-ai` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/spare-parts/import-csv` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/equipment-library/technical-3d-models` | NÃO | routes/admin/equipmentLibrary.js | sim |
| POST | `/api/admin/equipment-library/technical-3d-models` | NÃO | routes/admin/equipmentLibrary.js | sim |
| PATCH | `/api/admin/equipment-library/technical-3d-models/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| DELETE | `/api/admin/equipment-library/technical-3d-models/:id` | NÃO | routes/admin/equipmentLibrary.js | sim |
| GET | `/api/admin/help-manual` | sim | routes/admin/helpManual.js | sim |
| GET | `/api/admin/help-manual/search` | sim | routes/admin/helpManual.js | sim |
| GET | `/api/admin/incidents` | NÃO | routes/admin/incidents.js | sim |
| GET | `/api/admin/incidents/:id` | NÃO | routes/admin/incidents.js | sim |
| PATCH | `/api/admin/incidents/:id` | NÃO | routes/admin/incidents.js | sim |
| GET | `/api/admin/incidents/stats` | NÃO | routes/admin/incidents.js | sim |
| GET | `/api/admin/learning/adjustments` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/adjustments/clear` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/approve` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/calibration/analyze` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/calibration/events` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/consensus/analyze` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/consensus/events` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/context-integrity` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/csi/current` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/csi/history` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/dashboard` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/drift/events` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/drift/report/:interactionId` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/event-queue-health` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/events/metrics` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/events/replay/:traceId` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/events/timeline/:traceId` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/integrity-readiness` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/legacy-runtime` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/policy-arbitration` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-contract` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-diff` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-discovery` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-evolution` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-facade` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-graph` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-obligations` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-readiness` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-sandbox` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-signals` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/policy-simulation` | NÃO | routes/adminLearning.js | sim |
| GET | `/api/admin/learning/proposals` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/reject` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/replay/:id` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/scan` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/snapshot` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/strategic/patterns` | NÃO | routes/adminLearning.js | — |
| POST | `/api/admin/learning/voting/analyze` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/learning/voting/config` | NÃO | routes/adminLearning.js | — |
| GET | `/api/admin/logistics/drivers` | sim | routes/admin/logistics.js | sim |
| POST | `/api/admin/logistics/drivers` | sim | routes/admin/logistics.js | sim |
| PUT | `/api/admin/logistics/drivers/:id` | sim | routes/admin/logistics.js | sim |
| DELETE | `/api/admin/logistics/drivers/:id` | sim | routes/admin/logistics.js | sim |
| GET | `/api/admin/logistics/points` | sim | routes/admin/logistics.js | sim |
| POST | `/api/admin/logistics/points` | sim | routes/admin/logistics.js | sim |
| PUT | `/api/admin/logistics/points/:id` | sim | routes/admin/logistics.js | sim |
| DELETE | `/api/admin/logistics/points/:id` | sim | routes/admin/logistics.js | sim |
| GET | `/api/admin/logistics/routes` | sim | routes/admin/logistics.js | sim |
| POST | `/api/admin/logistics/routes` | sim | routes/admin/logistics.js | sim |
| PUT | `/api/admin/logistics/routes/:id` | sim | routes/admin/logistics.js | sim |
| DELETE | `/api/admin/logistics/routes/:id` | sim | routes/admin/logistics.js | sim |
| GET | `/api/admin/logistics/vehicles` | sim | routes/admin/logistics.js | sim |
| POST | `/api/admin/logistics/vehicles` | sim | routes/admin/logistics.js | sim |
| PUT | `/api/admin/logistics/vehicles/:id` | sim | routes/admin/logistics.js | sim |
| DELETE | `/api/admin/logistics/vehicles/:id` | sim | routes/admin/logistics.js | sim |
| GET | `/api/admin/logs/ai-traces` | sim | routes/admin/logs.js | sim |
| GET | `/api/admin/logs/audit` | NÃO | routes/admin/logs.js | sim |
| GET | `/api/admin/logs/audit/:id` | NÃO | routes/admin/logs.js | sim |
| GET | `/api/admin/logs/data-access` | NÃO | routes/admin/logs.js | sim |
| POST | `/api/admin/logs/export` | NÃO | routes/admin/logs.js | sim |
| GET | `/api/admin/logs/stats/security` | NÃO | routes/admin/logs.js | sim |
| GET | `/api/admin/logs/stats/summary` | NÃO | routes/admin/logs.js | — |
| GET | `/api/admin/nexus-custos` | sim | routes/admin/nexusCustos.js | sim |
| GET | `/api/admin/nexus-wallet` | NÃO | routes/admin/nexusWallet.js | sim |
| POST | `/api/admin/nexus-wallet/checkout/pagseguro` | NÃO | routes/admin/nexusWallet.js | sim |
| POST | `/api/admin/nexus-wallet/checkout/stripe` | NÃO | routes/admin/nexusWallet.js | sim |
| PUT | `/api/admin/nexus-wallet/rates/:servico` | NÃO | routes/admin/nexusWallet.js | sim |
| DELETE | `/api/admin/nexus-wallet/rates/:servico` | NÃO | routes/admin/nexusWallet.js | sim |
| PATCH | `/api/admin/nexus-wallet/settings` | NÃO | routes/admin/nexusWallet.js | sim |
| GET | `/api/admin/operational-teams` | NÃO | routes/admin/operationalTeams.js | sim |
| POST | `/api/admin/operational-teams` | NÃO | routes/admin/operationalTeams.js | sim |
| GET | `/api/admin/operational-teams/:id` | NÃO | routes/admin/operationalTeams.js | sim |
| PUT | `/api/admin/operational-teams/:id` | NÃO | routes/admin/operationalTeams.js | sim |
| POST | `/api/admin/operational-teams/:id/collective-user` | NÃO | routes/admin/operationalTeams.js | sim |
| POST | `/api/admin/operational-teams/:id/members` | NÃO | routes/admin/operationalTeams.js | sim |
| PUT | `/api/admin/operational-teams/:id/members/:memberId` | NÃO | routes/admin/operationalTeams.js | sim |
| DELETE | `/api/admin/operational-teams/:id/members/:memberId` | NÃO | routes/admin/operationalTeams.js | sim |
| GET | `/api/admin/operational-teams/exports/member-events` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/operational-teams/exports/member-events.csv` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/operational-teams/health/alerts` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/operational-teams/reports/member-activity` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/operational-teams/reports/team-activity` | NÃO | routes/admin/operationalTeamsMetrics.js | sim |
| GET | `/api/admin/raw-materials` | sim | routes/admin/rawMaterials.js | — |
| POST | `/api/admin/raw-materials` | sim | routes/admin/rawMaterials.js | — |
| GET | `/api/admin/raw-materials/:id` | sim | routes/admin/rawMaterials.js | — |
| PUT | `/api/admin/raw-materials/:id` | sim | routes/admin/rawMaterials.js | — |
| DELETE | `/api/admin/raw-materials/:id` | sim | routes/admin/rawMaterials.js | — |
| GET | `/api/admin/runtime/ai-anonymization` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/ai-anonymization/run` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/ai-anonymization/worker` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/ai-anonymization/worker/run` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/ai-governance` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/ai-governance/iso42001` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/ai-governance/sync-registry` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/edge-runtime` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/edge-runtime/queue` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/edge-runtime/sync` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/federation` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/federation/login-traces` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/federation/providers` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/federation/providers` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/federation/scim-token` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/flags/conflicts` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/flags/diagnostics` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/flags/effective` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/hallucination-detection` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/hallucination-detection/bootstrap-schema` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/hallucination-detection/false-positive` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/hallucination-detection/review-queue` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/industrial-lab/e2e` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/industrial-lab/runs` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/kms` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/kms/cache/invalidate` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/kms/metrics` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/kms/rotation` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/kms/rotation/emit` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/mfa` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/mfa/audit-events` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/mfa/policies` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/mfa/policies` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/modbus-real` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/modbus-real/audit` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/modbus-real/devices` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/modbus-real/devices` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/modbus-real/poll` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/modbus-real/reconnect` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/mqtt-real` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/mqtt-real/audit` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/mqtt-real/brokers` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/mqtt-real/brokers` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/mqtt-real/reconnect` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/observability-apm` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/observability-prometheus-preview` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/opcua-real` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/opcua-real/audit` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/opcua-real/reconnect` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/opcua-real/servers` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/opcua-real/servers` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention-eligibility` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention-enforce` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/retention-enforce/run` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention-pilot` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/retention-pilot/run` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention-registry` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention-shadow` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/retention-shadow/scan` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention-worker` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/retention-worker/run` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/retention/run` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/retention/status` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/state-classification` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/state-enforcement` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/sz4-persistence` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/sz4-persistence/bootstrap-schema` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/sz4-persistence/purge-expired` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/sz5-activation` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/sz5-activation/phase1` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/sz5-activation/phase2/validate` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/sz5-anonymization` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/sz5-anonymization/purge` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/sz5-anonymization/run` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/runtime/tenant-rls` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/tenant-rls/activate` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/tenant-rls/chaos` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/tenant-rls/deactivate` | sim | routes/admin/runtimeFlags.js | — |
| POST | `/api/admin/runtime/tenant-rls/fuzz` | sim | routes/admin/runtimeFlags.js | — |
| GET | `/api/admin/settings/company` | NÃO | routes/admin/settings.js | sim |
| PUT | `/api/admin/settings/company` | NÃO | routes/admin/settings.js | sim |
| POST | `/api/admin/settings/company/policy-upload` | NÃO | routes/admin/settings.js | sim |
| GET | `/api/admin/settings/dashboard-visibility` | NÃO | routes/admin/settings.js | sim |
| PUT | `/api/admin/settings/dashboard-visibility/:level` | NÃO | routes/admin/settings.js | sim |
| GET | `/api/admin/settings/manuals` | NÃO | routes/admin/settings.js | sim |
| POST | `/api/admin/settings/manuals` | NÃO | routes/admin/settings.js | sim |
| DELETE | `/api/admin/settings/manuals/:id` | NÃO | routes/admin/settings.js | sim |
| GET | `/api/admin/settings/notification-contacts` | NÃO | routes/admin/settings.js | sim |
| POST | `/api/admin/settings/notification-contacts` | NÃO | routes/admin/settings.js | sim |
| DELETE | `/api/admin/settings/notification-contacts/:id` | NÃO | routes/admin/settings.js | sim |
| GET | `/api/admin/settings/notifications` | NÃO | routes/admin/settings.js | sim |
| PUT | `/api/admin/settings/notifications` | NÃO | routes/admin/settings.js | sim |
| GET | `/api/admin/settings/pops` | NÃO | routes/admin/settings.js | sim |
| POST | `/api/admin/settings/pops` | NÃO | routes/admin/settings.js | sim |
| DELETE | `/api/admin/settings/pops/:id` | NÃO | routes/admin/settings.js | sim |
| GET | `/api/admin/structural/ai-config` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/ai-config` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/ai-config/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/ai-config/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/area-responsibles` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/area-responsibles` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/area-responsibles/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/area-responsibles/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/assets` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/assets` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/assets/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/assets/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/checklists` | NÃO | routes/admin/structural.js | — |
| POST | `/api/admin/structural/checklists` | NÃO | routes/admin/structural.js | — |
| PUT | `/api/admin/structural/checklists/:id` | NÃO | routes/admin/structural.js | — |
| DELETE | `/api/admin/structural/checklists/:id` | NÃO | routes/admin/structural.js | — |
| GET | `/api/admin/structural/communication-rules` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/communication-rules` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/communication-rules/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/communication-rules/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/company-data` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/company-data` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/failure-risks` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/failure-risks` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/failure-risks/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/failure-risks/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/indicators` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/indicators` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/indicators/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/indicators/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/knowledge-documents` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/knowledge-documents` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/knowledge-documents/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/knowledge-documents/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/organizational-units` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/organizational-units` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/organizational-units/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/organizational-units/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/processes` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/processes` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/processes/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/processes/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/production-lines` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/production-lines` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/production-lines/:id` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/production-lines/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/production-lines/:id` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/production-lines/:id/machines` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/production-lines/:lineId/machines/:machineId` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/production-lines/:lineId/machines/:machineId` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/products` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/products` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/products/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/products/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/references` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/roles` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/roles` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/roles/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/roles/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/roles/:id/identity` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/roles/preview-modules` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/routines` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/routines` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/routines/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/routines/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/sectors` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/sectors` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/sectors/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/sectors/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/structural/shifts` | NÃO | routes/admin/structural.js | sim |
| POST | `/api/admin/structural/shifts` | NÃO | routes/admin/structural.js | sim |
| PUT | `/api/admin/structural/shifts/:id` | NÃO | routes/admin/structural.js | sim |
| DELETE | `/api/admin/structural/shifts/:id` | NÃO | routes/admin/structural.js | sim |
| GET | `/api/admin/tenant-admins` | NÃO | routes/admin/tenantAdmins.js | sim |
| POST | `/api/admin/tenant-admins` | NÃO | routes/admin/tenantAdmins.js | sim |
| DELETE | `/api/admin/tenant-admins/:id` | NÃO | routes/admin/tenantAdmins.js | sim |
| POST | `/api/admin/time-clock/import` | NÃO | routes/admin/timeClock.js | — |
| GET | `/api/admin/time-clock/integration` | NÃO | routes/admin/timeClock.js | — |
| PUT | `/api/admin/time-clock/integration` | NÃO | routes/admin/timeClock.js | — |
| POST | `/api/admin/time-clock/sync` | NÃO | routes/admin/timeClock.js | — |
| GET | `/api/admin/time-clock/systems` | NÃO | routes/admin/timeClock.js | — |
| POST | `/api/admin/time-clock/validate` | NÃO | routes/admin/timeClock.js | — |
| GET | `/api/admin/users` | NÃO | routes/admin/users.js | sim |
| POST | `/api/admin/users` | NÃO | routes/admin/users.js | sim |
| GET | `/api/admin/users/:id` | NÃO | routes/admin/users.js | sim |
| PUT | `/api/admin/users/:id` | NÃO | routes/admin/users.js | sim |
| DELETE | `/api/admin/users/:id` | NÃO | routes/admin/users.js | sim |
| PATCH | `/api/admin/users/:id/profile-context` | NÃO | routes/admin/users.js | sim |
| POST | `/api/admin/users/:id/reset-password` | NÃO | routes/admin/users.js | sim |
| DELETE | `/api/admin/users/:userId/sessions/:sessionId` | NÃO | routes/admin/users.js | sim |
| GET | `/api/admin/users/meta/functional-areas` | NÃO | routes/admin/users.js | sim |
| GET | `/api/admin/users/stats/summary` | NÃO | routes/admin/users.js | sim |
| GET | `/api/admin/warehouse/balances` | sim | routes/admin/warehouse.js | — |
| GET | `/api/admin/warehouse/categories` | sim | routes/admin/warehouse.js | sim |
| POST | `/api/admin/warehouse/categories` | sim | routes/admin/warehouse.js | sim |
| PUT | `/api/admin/warehouse/categories/:id` | sim | routes/admin/warehouse.js | sim |
| DELETE | `/api/admin/warehouse/categories/:id` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/admin/warehouse/links` | sim | routes/admin/warehouse.js | — |
| POST | `/api/admin/warehouse/links` | sim | routes/admin/warehouse.js | — |
| DELETE | `/api/admin/warehouse/links/:id` | sim | routes/admin/warehouse.js | — |
| GET | `/api/admin/warehouse/locations` | sim | routes/admin/warehouse.js | sim |
| POST | `/api/admin/warehouse/locations` | sim | routes/admin/warehouse.js | sim |
| PUT | `/api/admin/warehouse/locations/:id` | sim | routes/admin/warehouse.js | sim |
| DELETE | `/api/admin/warehouse/locations/:id` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/admin/warehouse/materials` | sim | routes/admin/warehouse.js | sim |
| POST | `/api/admin/warehouse/materials` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/admin/warehouse/materials/:id` | sim | routes/admin/warehouse.js | — |
| PUT | `/api/admin/warehouse/materials/:id` | sim | routes/admin/warehouse.js | sim |
| DELETE | `/api/admin/warehouse/materials/:id` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/admin/warehouse/movements` | sim | routes/admin/warehouse.js | sim |
| POST | `/api/admin/warehouse/movements` | sim | routes/admin/warehouse.js | — |
| GET | `/api/admin/warehouse/params` | sim | routes/admin/warehouse.js | sim |
| PUT | `/api/admin/warehouse/params` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/admin/warehouse/references` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/admin/warehouse/suppliers` | sim | routes/admin/warehouse.js | sim |
| POST | `/api/admin/warehouse/suppliers` | sim | routes/admin/warehouse.js | sim |
| PUT | `/api/admin/warehouse/suppliers/:id` | sim | routes/admin/warehouse.js | sim |
| DELETE | `/api/admin/warehouse/suppliers/:id` | sim | routes/admin/warehouse.js | sim |
| GET | `/api/ai/governance/compliance/iso42001` | sim | routes/aiGovernance.js | — |
| GET | `/api/ai/governance/hallucination/:traceId` | sim | routes/aiGovernance.js | — |
| GET | `/api/ai/governance/lineage/:traceId` | sim | routes/aiGovernance.js | — |
| GET | `/api/ai/governance/models` | sim | routes/aiGovernance.js | — |
| GET | `/api/ai/governance/models/:modelKey/card` | sim | routes/aiGovernance.js | — |
| GET | `/api/ai/governance/traces/:traceId/card` | sim | routes/aiGovernance.js | — |
| GET | `/api/aioi/archive/milestone` | sim | routes/aioi/aioiArchiveRoutes.js | sim |
| GET | `/api/aioi/archive/registry` | sim | routes/aioi/aioiArchiveRoutes.js | sim |
| GET | `/api/aioi/archive/report` | sim | routes/aioi/aioiArchiveRoutes.js | sim |
| GET | `/api/aioi/archive/status` | sim | routes/aioi/aioiArchiveRoutes.js | sim |
| GET | `/api/aioi/assurance/consistency` | sim | routes/aioi/aioiAssuranceRoutes.js | sim |
| GET | `/api/aioi/assurance/preservation` | sim | routes/aioi/aioiAssuranceRoutes.js | sim |
| GET | `/api/aioi/assurance/status` | sim | routes/aioi/aioiAssuranceRoutes.js | sim |
| GET | `/api/aioi/assurance/traceability` | sim | routes/aioi/aioiAssuranceRoutes.js | sim |
| GET | `/api/aioi/authorization/history` | sim | routes/aioi/aioiAuthorizationRoutes.js | sim |
| GET | `/api/aioi/authorization/policies` | sim | routes/aioi/aioiAuthorizationRoutes.js | sim |
| GET | `/api/aioi/authorization/requests` | sim | routes/aioi/aioiAuthorizationRoutes.js | sim |
| GET | `/api/aioi/authorization/status` | sim | routes/aioi/aioiAuthorizationRoutes.js | sim |
| GET | `/api/aioi/baseline/audit` | sim | routes/aioi/aioiBaselineRoutes.js | sim |
| GET | `/api/aioi/baseline/manifest` | sim | routes/aioi/aioiBaselineRoutes.js | sim |
| GET | `/api/aioi/baseline/reproducibility` | sim | routes/aioi/aioiBaselineRoutes.js | sim |
| GET | `/api/aioi/baseline/status` | sim | routes/aioi/aioiBaselineRoutes.js | sim |
| GET | `/api/aioi/cockpit/decision-visualization` | sim | routes/aioi/aioiCockpitRoutes.js | — |
| GET | `/api/aioi/cockpit/interface-intelligence` | sim | routes/aioi/aioiCockpitRoutes.js | — |
| GET | `/api/aioi/cockpit/overview` | sim | routes/aioi/aioiCockpitRoutes.js | — |
| GET | `/api/aioi/cockpit/read-model` | sim | routes/aioi/aioiCockpitRoutes.js | — |
| GET | `/api/aioi/cockpit/summary` | sim | routes/aioi/aioiCockpitRoutes.js | — |
| GET | `/api/aioi/compliance/drift` | sim | routes/aioi/aioiComplianceRoutes.js | sim |
| GET | `/api/aioi/compliance/governance` | sim | routes/aioi/aioiComplianceRoutes.js | sim |
| GET | `/api/aioi/compliance/integrity` | sim | routes/aioi/aioiComplianceRoutes.js | sim |
| GET | `/api/aioi/compliance/status` | sim | routes/aioi/aioiComplianceRoutes.js | sim |
| GET | `/api/aioi/executive-cockpit/view-model-bundle` | sim | routes/aioi/aioiExecutiveCockpitViewModelRoutes.js | — |
| GET | `/api/aioi/governance/capacity` | sim | routes/aioi/aioiGovernanceRoutes.js | sim |
| GET | `/api/aioi/governance/retention` | sim | routes/aioi/aioiGovernanceRoutes.js | sim |
| GET | `/api/aioi/governance/status` | sim | routes/aioi/aioiGovernanceRoutes.js | sim |
| GET | `/api/aioi/health` | NÃO | routes/aioi/aioiQueueRoutes.js | sim |
| GET | `/api/aioi/operations/certification` | sim | routes/aioi/aioiOperationsRoutes.js | sim |
| GET | `/api/aioi/operations/consistency` | sim | routes/aioi/aioiOperationsRoutes.js | sim |
| GET | `/api/aioi/operations/dataset` | sim | routes/aioi/aioiOperationsRoutes.js | sim |
| GET | `/api/aioi/operations/workload` | sim | routes/aioi/aioiOperationsRoutes.js | sim |
| GET | `/api/aioi/production/approval` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/audit` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/certifications` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/deployment` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/readiness` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/readiness-history` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/risk` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/production/rollouts` | sim | routes/aioi/aioiProductionRoutes.js | sim |
| GET | `/api/aioi/queue` | NÃO | routes/aioi/aioiQueueRoutes.js | sim |
| GET | `/api/aioi/queue/bundle` | NÃO | routes/aioi/aioiQueueRoutes.js | sim |
| GET | `/api/aioi/recovery/chain` | sim | routes/aioi/aioiRecoveryRoutes.js | sim |
| GET | `/api/aioi/recovery/continuity` | sim | routes/aioi/aioiRecoveryRoutes.js | sim |
| GET | `/api/aioi/recovery/rebuild` | sim | routes/aioi/aioiRecoveryRoutes.js | sim |
| GET | `/api/aioi/recovery/status` | sim | routes/aioi/aioiRecoveryRoutes.js | sim |
| GET | `/api/aioi/release/governance` | sim | routes/aioi/aioiReleaseRoutes.js | sim |
| GET | `/api/aioi/release/readiness` | sim | routes/aioi/aioiReleaseRoutes.js | sim |
| GET | `/api/aioi/release/registry` | sim | routes/aioi/aioiReleaseRoutes.js | sim |
| GET | `/api/aioi/release/status` | sim | routes/aioi/aioiReleaseRoutes.js | sim |
| GET | `/api/aioi/runtime/health` | sim | routes/aioi/aioiRuntimeRoutes.js | sim |
| GET | `/api/aioi/runtime/metrics` | sim | routes/aioi/aioiRuntimeRoutes.js | sim |
| GET | `/api/aioi/runtime/status` | sim | routes/aioi/aioiRuntimeRoutes.js | sim |
| GET | `/api/aioi/scale/audit` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/benchmark` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/capacity` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/distributed` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/health` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/leases` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/ownership` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/partitions` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/registry` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/runtime` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/status` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/telemetry` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/validation` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/aioi/scale/workers` | sim | routes/aioi/aioiScaleRoutes.js | sim |
| GET | `/api/alerts` | sim | routes/alerts.js | — |
| POST | `/api/analytics/aggregations` | sim | domains/analytics/routes/analyticsRoutes.js | — |
| POST | `/api/analytics/forecasts` | sim | domains/analytics/routes/analyticsRoutes.js | — |
| GET | `/api/analytics/health` | sim | domains/analytics/routes/analyticsRoutes.js | — |
| POST | `/api/analytics/kpis` | sim | domains/analytics/routes/analyticsRoutes.js | — |
| POST | `/api/analytics/trends` | sim | domains/analytics/routes/analyticsRoutes.js | — |
| GET | `/api/anam/config` | sim | routes/anam.js | sim |
| POST | `/api/anam/prepare` | sim | routes/anam.js | sim |
| GET | `/api/anam/public-config` | NÃO | routes/anam.js | sim |
| POST | `/api/anam/session-token` | sim | routes/anam.js | sim |
| POST | `/api/app-communications` | NÃO | routes/appCommunications.js | sim |
| GET | `/api/app-communications` | NÃO | routes/appCommunications.js | sim |
| GET | `/api/app-communications/notifications` | NÃO | routes/appCommunications.js | sim |
| PATCH | `/api/app-communications/notifications/:id/read` | NÃO | routes/appCommunications.js | sim |
| GET | `/api/app-communications/notifications/unread-count` | NÃO | routes/appCommunications.js | sim |
| GET | `/api/app-communications/unified-notifications` | NÃO | routes/appCommunications.js | sim |
| POST | `/api/app-impetus/messages` | sim | routes/app_impetus.js | sim |
| GET | `/api/app-impetus/outbox` | sim | routes/app_impetus.js | sim |
| GET | `/api/app-impetus/status` | sim | routes/app_impetus.js | sim |
| GET | `/api/asset-management/orders` | sim | routes/assetManagement.js | — |
| POST | `/api/asset-management/orders` | sim | routes/assetManagement.js | — |
| POST | `/api/asset-management/orders/:id/approve` | sim | routes/assetManagement.js | — |
| POST | `/api/asset-management/orders/:id/reassign` | sim | routes/assetManagement.js | — |
| GET | `/api/asset-management/stock` | sim | routes/assetManagement.js | — |
| PATCH | `/api/asset-management/stock/:id` | sim | routes/assetManagement.js | — |
| POST | `/api/asset-management/stock/purchase-order` | sim | routes/assetManagement.js | — |
| GET | `/api/asset-management/twins` | sim | routes/assetManagement.js | — |
| GET | `/api/asset-management/twins/:id` | sim | routes/assetManagement.js | — |
| POST | `/api/asset-management/twins/:id/simulate` | sim | routes/assetManagement.js | — |
| POST | `/api/auth/forgot-password` | NÃO | routes/auth.js | sim |
| POST | `/api/auth/login` | NÃO | routes/auth.js | sim |
| POST | `/api/auth/logout` | NÃO | routes/auth.js | sim |
| POST | `/api/auth/mfa/backup/regenerate` | sim | routes/authMfa.js | — |
| POST | `/api/auth/mfa/devices/revoke-all` | sim | routes/authMfa.js | — |
| POST | `/api/auth/mfa/enroll/totp/begin` | sim | routes/authMfa.js | — |
| POST | `/api/auth/mfa/enroll/totp/confirm` | sim | routes/authMfa.js | — |
| POST | `/api/auth/mfa/enroll/webauthn/registration-options` | sim | routes/authMfa.js | — |
| POST | `/api/auth/mfa/enroll/webauthn/registration-verify` | sim | routes/authMfa.js | — |
| GET | `/api/auth/mfa/policy` | sim | routes/authMfa.js | — |
| GET | `/api/auth/mfa/status` | NÃO | routes/authMfa.js | — |
| POST | `/api/auth/mfa/verify` | NÃO | routes/authMfa.js | — |
| POST | `/api/auth/mfa/webauthn/authentication-options` | NÃO | routes/authMfa.js | — |
| POST | `/api/auth/reset-password` | NÃO | routes/auth.js | sim |
| POST | `/api/auth/verify-password` | NÃO | routes/auth.js | sim |
| POST | `/api/cadastrar-com-ia` | sim | routes/cadastrarComIA.js | sim |
| GET | `/api/cadastrar-com-ia` | sim | routes/cadastrarComIA.js | sim |
| GET | `/api/central-ai/alerts` | sim | routes/centralIndustryAI.js | — |
| POST | `/api/central-ai/decision/analyze` | NÃO | routes/centralIndustryAI.js | — |
| GET | `/api/central-ai/decision/criteria` | sim | routes/centralIndustryAI.js | — |
| GET | `/api/central-ai/insights` | sim | routes/centralIndustryAI.js | — |
| GET | `/api/central-ai/intelligence` | sim | routes/centralIndustryAI.js | — |
| GET | `/api/central-ai/operational-brain/summary` | sim | routes/centralIndustryAI.js | — |
| GET | `/api/central-ai/predictions` | sim | routes/centralIndustryAI.js | — |
| GET | `/api/central-ai/sectors` | sim | routes/centralIndustryAI.js | — |
| POST | `/api/certification-readiness/assess` | sim | routes/certificationReadiness.js | sim |
| GET | `/api/certification-readiness/assess/quick` | sim | routes/certificationReadiness.js | sim |
| GET | `/api/certification-readiness/frameworks` | sim | routes/certificationReadiness.js | sim |
| GET | `/api/certification-readiness/health` | sim | routes/certificationReadiness.js | sim |
| GET | `/api/certification-readiness/snapshots` | sim | routes/certificationReadiness.js | sim |
| GET | `/api/chat/conversations` | sim | routes/chat.js | — |
| POST | `/api/chat/conversations` | sim | routes/chat.js | — |
| GET | `/api/chat/conversations/:id/messages` | sim | routes/chat.js | — |
| POST | `/api/chat/conversations/:id/messages` | sim | routes/chat.js | — |
| GET | `/api/chat/conversations/:id/participants` | sim | routes/chat.js | — |
| POST | `/api/chat/conversations/:id/participants` | sim | routes/chat.js | — |
| DELETE | `/api/chat/conversations/:id/participants/:uid` | sim | routes/chat.js | — |
| PUT | `/api/chat/me/avatar` | sim | routes/chat.js | — |
| PUT | `/api/chat/messages/:id/read` | sim | routes/chat.js | — |
| POST | `/api/chat/messages/:messageId/delete` | sim | routes/chat.js | — |
| GET | `/api/chat/metrics` | sim | routes/chatMetrics.js | — |
| POST | `/api/chat/push/subscribe` | sim | routes/chat.js | — |
| POST | `/api/chat/upload` | sim | routes/chat.js | — |
| GET | `/api/chat/users` | sim | routes/chat.js | — |
| GET | `/api/cognitive-activation/log` | sim | routes/cognitiveActivation.js | — |
| GET | `/api/cognitive-activation/operational` | sim | routes/cognitiveActivation.js | — |
| GET | `/api/cognitive-activation/readiness` | sim | routes/cognitiveActivation.js | — |
| GET | `/api/cognitive-activation/status` | sim | routes/cognitiveActivation.js | — |
| GET | `/api/cognitive-council/example-payload` | sim | routes/cognitiveCouncil.js | — |
| POST | `/api/cognitive-council/execute` | sim | routes/cognitiveCouncil.js | — |
| POST | `/api/cognitive-council/hitl` | sim | routes/cognitiveCouncil.js | — |
| GET | `/api/cognitive-council/trace/:traceId` | sim | routes/cognitiveCouncil.js | — |
| GET | `/api/cognitive-registry/blocks/:blockId` | sim | routes/cognitiveRegistry.js | — |
| POST | `/api/cognitive-registry/cache/invalidate` | sim | routes/cognitiveRegistry.js | — |
| GET | `/api/cognitive-registry/divergence` | sim | routes/cognitiveRegistry.js | — |
| GET | `/api/cognitive-registry/domains/:domainKey` | sim | routes/cognitiveRegistry.js | — |
| GET | `/api/cognitive-registry/domains/:domainKey/blocks` | sim | routes/cognitiveRegistry.js | — |
| GET | `/api/cognitive-registry/health` | sim | routes/cognitiveRegistry.js | — |
| GET | `/api/cognitive-registry/snapshot` | sim | routes/cognitiveRegistry.js | — |
| GET | `/api/cognitive-registry/sources` | sim | routes/cognitiveRegistry.js | — |
| POST | `/api/communications` | NÃO | routes/communications.js | sim |
| GET | `/api/communications` | sim | routes/communications.js | sim |
| GET | `/api/communications/:id` | sim | routes/communications.js | sim |
| GET | `/api/communications/recent` | sim | routes/communications.js | — |
| POST | `/api/companies` | NÃO | routes/companies.js | sim |
| GET | `/api/companies/me` | sim | routes/companies.js | sim |
| GET | `/api/dashboard/charts/bundle` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/charts/production-demand` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/charts/pulse-climate` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/chat` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/chat-multimodal` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/chat/voice/debug` | sim | routes/chatVoice.js | — |
| POST | `/api/dashboard/chat/voice/format-alert` | sim | routes/chatVoice.js | sim |
| GET | `/api/dashboard/chat/voice/preferences` | sim | routes/chatVoice.js | sim |
| PUT | `/api/dashboard/chat/voice/preferences` | sim | routes/chatVoice.js | sim |
| POST | `/api/dashboard/chat/voice/speak` | sim | routes/chatVoice.js | — |
| POST | `/api/dashboard/chat/voice/transcribe` | sim | routes/chatVoice.js | sim |
| POST | `/api/dashboard/chat/voice/welcome` | sim | routes/chatVoice.js | sim |
| POST | `/api/dashboard/claude-panel` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/cognitive-pulse` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/config` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/costs/by-origin` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/costs/executive-summary` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/costs/items` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/costs/items` | sim | routes/dashboard.js | sim |
| PUT | `/api/dashboard/costs/items/:id` | sim | routes/dashboard.js | sim |
| DELETE | `/api/dashboard/costs/items/:id` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/costs/projected-loss` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/costs/top-loss` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/favorite-kpis` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/forecasting/alerts` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/forecasting/health` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/forecasting/projections` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/identity-observability` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/insights` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/invalidar-cache` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/kpis` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/live-surface` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/live-surface/stream` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/me` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/panel-command` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/personalizado` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/preferences` | sim | routes/dashboard.js | sim |
| PATCH | `/api/dashboard/profile-context` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/recent-interactions` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/smart-summary` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/summary` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/track-interaction` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/trend` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/decision-trace` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/divergence` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/v2/feedback` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/capabilities` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/history` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/integrity` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/recommendations` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/risks` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/score/:userId` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/governance/snapshot` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/identity-audit` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/v2/modules/clear-fallback` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/v2/modules/fallback` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/modules/preview/:userId?` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/modules/registry` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/modules/state` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/v2/modules/telemetry` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/v2/modules/usage` | sim | routes/dashboard.js | — |
| POST | `/api/dashboard/v2/usage` | sim | routes/dashboard.js | — |
| GET | `/api/dashboard/visibility` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/voice-realtime-context` | sim | routes/dashboard.js | sim |
| POST | `/api/dashboard/voice-truth-shadow-validate` | sim | routes/dashboard.js | sim |
| GET | `/api/dashboard/widgets` | sim | routes/dashboard.js | sim |
| GET | `/api/deprecation-governance/audit` | sim | routes/deprecationGovernance.js | — |
| GET | `/api/deprecation-governance/catalog` | sim | routes/deprecationGovernance.js | — |
| GET | `/api/deprecation-governance/health` | sim | routes/deprecationGovernance.js | — |
| POST | `/api/deprecation-governance/report` | sim | routes/deprecationGovernance.js | — |
| GET | `/api/deprecation-governance/usage` | sim | routes/deprecationGovernance.js | — |
| GET | `/api/diag-report/:id` | sim | routes/diag_report.js | — |
| GET | `/api/diag-report/cognitive-health` | sim | routes/diag_report.js | — |
| POST | `/api/diagnostic` | sim | routes/diagnostic.js | sim |
| POST | `/api/diagnostic/validate` | sim | routes/diagnostic.js | sim |
| POST | `/api/did/talks` | sim | routes/did.js | — |
| GET | `/api/did/talks/:id` | sim | routes/did.js | — |
| GET | `/api/enterprise-locale/catalogs` | sim | routes/enterpriseLocale.js | sim |
| GET | `/api/enterprise-locale/context` | sim | routes/enterpriseLocale.js | sim |
| POST | `/api/enterprise-locale/currency/convert` | sim | routes/enterpriseLocale.js | sim |
| POST | `/api/enterprise-locale/format/currency` | sim | routes/enterpriseLocale.js | sim |
| POST | `/api/enterprise-locale/format/datetime` | sim | routes/enterpriseLocale.js | sim |
| GET | `/api/enterprise-locale/gdpr/alignment` | sim | routes/enterpriseLocale.js | — |
| GET | `/api/enterprise-locale/health` | sim | routes/enterpriseLocale.js | sim |
| GET | `/api/enterprise-locale/residency/evaluate` | sim | routes/enterpriseLocale.js | — |
| GET | `/api/enterprise-locale/translate/:key` | sim | routes/enterpriseLocale.js | — |
| GET | `/api/f49/ceo/session` | sim | routes/f49/f49CeoRoutes.js | — |
| GET | `/api/f49/ceo/status` | sim | routes/f49/f49CeoRoutes.js | — |
| GET | `/api/f49/closure/final-status` | sim | routes/audit/truthClosureRoutes.js | sim |
| GET | `/api/f49/closure/registry` | sim | routes/audit/truthClosureRoutes.js | sim |
| GET | `/api/f49/closure/report` | sim | routes/audit/truthClosureRoutes.js | sim |
| GET | `/api/f49/closure/status` | sim | routes/audit/truthClosureRoutes.js | sim |
| GET | `/api/f49/gemini/benchmark` | sim | routes/f49/f49GeminiRoutes.js | sim |
| GET | `/api/f49/gemini/readiness` | sim | routes/f49/f49GeminiRoutes.js | sim |
| GET | `/api/f49/gemini/status` | sim | routes/f49/f49GeminiRoutes.js | sim |
| GET | `/api/f49/gemini/vision` | sim | routes/f49/f49GeminiRoutes.js | sim |
| GET | `/api/factory-team/context` | sim | routes/factoryTeam.js | sim |
| POST | `/api/factory-team/session/clear-active-member` | sim | routes/factoryTeam.js | sim |
| POST | `/api/factory-team/session/member` | sim | routes/factoryTeam.js | — |
| POST | `/api/factory-team/session/member/confirm-continue` | sim | routes/factoryTeam.js | — |
| POST | `/api/factory-team/session/member/suggested` | sim | routes/factoryTeam.js | — |
| POST | `/api/factory-team/session/verify-operator` | sim | routes/factoryTeam.js | sim |
| GET | `/api/federation/oidc/:companyId/login` | NÃO | routes/federation.js | — |
| GET | `/api/federation/oidc/callback` | NÃO | routes/federation.js | — |
| GET | `/api/federation/saml/:companyId/login` | NÃO | routes/federation.js | — |
| POST | `/api/federation/saml/acs` | NÃO | routes/federation.js | — |
| GET | `/api/federation/saml/metadata/:companyId` | NÃO | routes/federation.js | — |
| GET | `/api/federation/scim/v2/ServiceProviderConfig` | NÃO | routes/federationScim.js | — |
| GET | `/api/federation/scim/v2/Users` | NÃO | routes/federationScim.js | — |
| POST | `/api/federation/scim/v2/Users` | NÃO | routes/federationScim.js | — |
| GET | `/api/federation/scim/v2/Users/:id` | NÃO | routes/federationScim.js | — |
| PATCH | `/api/federation/scim/v2/Users/:id` | NÃO | routes/federationScim.js | — |
| DELETE | `/api/federation/scim/v2/Users/:id` | NÃO | routes/federationScim.js | — |
| GET | `/api/federation/status` | NÃO | routes/federation.js | — |
| POST | `/api/feedback` | sim | routes/feedback.js | — |
| POST | `/api/final-consolidation-audit/audit` | sim | routes/finalConsolidationAudit.js | sim |
| GET | `/api/final-consolidation-audit/audit/quick` | sim | routes/finalConsolidationAudit.js | sim |
| GET | `/api/final-consolidation-audit/health` | sim | routes/finalConsolidationAudit.js | sim |
| GET | `/api/final-consolidation-audit/prompts` | sim | routes/finalConsolidationAudit.js | sim |
| GET | `/api/final-consolidation-audit/snapshots` | sim | routes/finalConsolidationAudit.js | sim |
| GET | `/api/hr-intelligence/alerts` | sim | routes/hrIntelligence.js | — |
| POST | `/api/hr-intelligence/alerts/:id/acknowledge` | sim | routes/hrIntelligence.js | — |
| GET | `/api/hr-intelligence/dashboard` | sim | routes/hrIntelligence.js | — |
| GET | `/api/hr-intelligence/indicators` | sim | routes/hrIntelligence.js | — |
| GET | `/api/hr-intelligence/integration-status` | sim | routes/hrIntelligence.js | — |
| PATCH | `/api/hr-intelligence/my-responsibilities` | sim | routes/hrIntelligence.js | — |
| GET | `/api/hr-intelligence/records` | sim | routes/hrIntelligence.js | — |
| GET | `/api/hr-intelligence/team-impact` | sim | routes/hrIntelligence.js | — |
| PUT | `/api/integrations/digital-twin/layout` | sim | routes/integrations.js | sim |
| GET | `/api/integrations/digital-twin/state` | sim | routes/integrations.js | sim |
| POST | `/api/integrations/edge/ingest` | NÃO | routes/integrations.js | — |
| POST | `/api/integrations/edge/register` | sim | routes/integrations.js | sim |
| GET | `/api/integrations/mes-erp/connectors` | sim | routes/integrations.js | sim |
| POST | `/api/integrations/mes-erp/connectors` | sim | routes/integrations.js | sim |
| POST | `/api/integrations/mes-erp/push` | NÃO | routes/integrations.js | — |
| POST | `/api/integrations/production/shift` | sim | routes/integrations.js | — |
| GET | `/api/integrations/production/shift` | sim | routes/integrations.js | — |
| POST | `/api/intelligent-registration` | NÃO | routes/intelligentRegistration.js | sim |
| GET | `/api/intelligent-registration` | NÃO | routes/intelligentRegistration.js | sim |
| GET | `/api/intelligent-registration/leadership` | NÃO | routes/intelligentRegistration.js | sim |
| GET | `/api/internal-chat/colaboradores` | sim | routes/internalChat.js | — |
| GET | `/api/internal-chat/conversations` | sim | routes/internalChat.js | — |
| POST | `/api/internal-chat/conversations` | sim | routes/internalChat.js | — |
| GET | `/api/internal-chat/conversations/:id/messages` | sim | routes/internalChat.js | — |
| POST | `/api/internal-chat/conversations/:id/messages` | sim | routes/internalChat.js | — |
| POST | `/api/internal-chat/conversations/:id/read` | sim | routes/internalChat.js | — |
| POST | `/api/lgpd/anonymize-user/:userId` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/consent` | sim | routes/lgpd.js | sim |
| DELETE | `/api/lgpd/consent/:type` | sim | routes/lgpd.js | sim |
| POST | `/api/lgpd/data-request` | sim | routes/lgpd.js | sim |
| GET | `/api/lgpd/data-requests` | sim | routes/lgpd.js | sim |
| PATCH | `/api/lgpd/data-requests/:id` | sim | routes/lgpd.js | — |
| DELETE | `/api/lgpd/delete-my-account` | sim | routes/lgpd.js | sim |
| GET | `/api/lgpd/my-data` | sim | routes/lgpd.js | sim |
| GET | `/api/lgpd/policy` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/erase/:requestId/approve` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/erase/:requestId/execute` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/erase/:requestId/reject` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/export/:id/approve` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/export/:id/execute` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/export/:id/reject` | sim | routes/lgpd.js | — |
| POST | `/api/lgpd/subject/me/erase` | sim | routes/lgpd.js | — |
| GET | `/api/lgpd/subject/me/erase/status` | sim | routes/lgpd.js | — |
| GET | `/api/lgpd/subject/me/export` | sim | routes/lgpd.js | — |
| GET | `/api/lgpd/subject/me/export/status` | sim | routes/lgpd.js | — |
| POST | `/api/live-dashboard/context/clear-fallback` | sim | routes/liveDashboard.js | — |
| POST | `/api/live-dashboard/context/fallback` | sim | routes/liveDashboard.js | — |
| GET | `/api/live-dashboard/context/state` | sim | routes/liveDashboard.js | — |
| GET | `/api/live-dashboard/context/telemetry` | sim | routes/liveDashboard.js | — |
| POST | `/api/live-dashboard/orchestration/execute` | sim | routes/liveDashboard.js | sim |
| GET | `/api/live-dashboard/snapshot-at` | sim | routes/liveDashboard.js | sim |
| GET | `/api/live-dashboard/snapshots` | sim | routes/liveDashboard.js | sim |
| GET | `/api/live-dashboard/state` | sim | routes/liveDashboard.js | sim |
| GET | `/api/logistics-intelligence/alerts` | sim | routes/logisticsIntelligence.js | — |
| POST | `/api/logistics-intelligence/alerts/:id/acknowledge` | sim | routes/logisticsIntelligence.js | — |
| GET | `/api/logistics-intelligence/dashboard` | sim | routes/logisticsIntelligence.js | — |
| GET | `/api/logistics-intelligence/expeditions` | sim | routes/logisticsIntelligence.js | — |
| POST | `/api/logistics-intelligence/expeditions` | sim | routes/logisticsIntelligence.js | — |
| PUT | `/api/logistics-intelligence/expeditions/:id` | sim | routes/logisticsIntelligence.js | — |
| GET | `/api/logistics-intelligence/indicators` | sim | routes/logisticsIntelligence.js | — |
| GET | `/api/logistics-intelligence/predictions` | sim | routes/logisticsIntelligence.js | — |
| POST | `/api/logistics-intelligence/run-alerts` | sim | routes/logisticsIntelligence.js | — |
| GET | `/api/logistics/health` | sim | domains/logistics/routes/logisticsRoutes.js | — |
| POST | `/api/logistics/inventory` | sim | domains/logistics/routes/logisticsRoutes.js | — |
| POST | `/api/logistics/lots` | sim | domains/logistics/routes/logisticsRoutes.js | — |
| POST | `/api/logistics/receipts` | sim | domains/logistics/routes/logisticsRoutes.js | — |
| POST | `/api/logistics/shipments` | sim | domains/logistics/routes/logisticsRoutes.js | — |
| GET | `/api/m1/adoption-progress/analytics` | sim | routes/adoptionProgressTrackerRoutes.js | sim |
| GET | `/api/m1/adoption-progress/esg` | sim | routes/adoptionProgressTrackerRoutes.js | sim |
| GET | `/api/m1/adoption-progress/logistics` | sim | routes/adoptionProgressTrackerRoutes.js | sim |
| GET | `/api/m1/adoption-progress/mes` | sim | routes/adoptionProgressTrackerRoutes.js | sim |
| GET | `/api/m1/adoption-progress/status` | sim | routes/adoptionProgressTrackerRoutes.js | sim |
| GET | `/api/m1/adoption-progress/workflow` | sim | routes/adoptionProgressTrackerRoutes.js | sim |
| GET | `/api/m1/critical-remediation/financial` | sim | routes/m1CriticalRemediationRoutes.js | sim |
| GET | `/api/m1/critical-remediation/production` | sim | routes/m1CriticalRemediationRoutes.js | sim |
| GET | `/api/m1/critical-remediation/quality` | sim | routes/m1CriticalRemediationRoutes.js | sim |
| GET | `/api/m1/critical-remediation/regression` | sim | routes/m1CriticalRemediationRoutes.js | sim |
| GET | `/api/m1/critical-remediation/status` | sim | routes/m1CriticalRemediationRoutes.js | sim |
| GET | `/api/m1/enterprise-promotion/global-01` | sim | routes/m1EnterprisePromotionRoutes.js | — |
| GET | `/api/m1/enterprise-promotion/global-02` | sim | routes/m1EnterprisePromotionRoutes.js | — |
| GET | `/api/m1/enterprise-promotion/mes-01` | sim | routes/m1EnterprisePromotionRoutes.js | — |
| GET | `/api/m1/enterprise-promotion/status` | sim | routes/m1EnterprisePromotionRoutes.js | — |
| GET | `/api/m1/enterprise-promotion/tel-01` | sim | routes/m1EnterprisePromotionRoutes.js | — |
| GET | `/api/m1/enterprise-promotion/tenant-fuzz` | sim | routes/m1EnterprisePromotionRoutes.js | — |
| GET | `/api/m1/enterprise-remaining/esg` | sim | routes/m1EnterpriseRemainingRoutes.js | — |
| GET | `/api/m1/enterprise-remaining/foundation` | sim | routes/m1EnterpriseRemainingRoutes.js | — |
| GET | `/api/m1/enterprise-remaining/status` | sim | routes/m1EnterpriseRemainingRoutes.js | — |
| GET | `/api/m1/enterprise-remaining/workflow` | sim | routes/m1EnterpriseRemainingRoutes.js | — |
| GET | `/api/m1/foodbase-pilot/aioi` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/domains` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/executive` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/foodbase-api` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/pilot-lists` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/profiles` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/provisioning` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/status` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase-pilot/strategy` | sim | routes/m1FoodBasePilotRoutes.js | sim |
| GET | `/api/m1/foodbase/environment` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/executive` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/financial` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/hr` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/maintenance` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/permissions` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/roles` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/safety` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/security` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/status` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/foodbase/tenant` | sim | routes/m1FoodBaseReadinessRoutes.js | sim |
| GET | `/api/m1/governance/dependencies` | sim | routes/m1GovernanceRoutes.js | sim |
| GET | `/api/m1/governance/evidence` | sim | routes/m1GovernanceRoutes.js | sim |
| GET | `/api/m1/governance/recommendation` | sim | routes/m1GovernanceRoutes.js | sim |
| GET | `/api/m1/governance/risks` | sim | routes/m1GovernanceRoutes.js | sim |
| GET | `/api/m1/governance/status` | sim | routes/m1GovernanceRoutes.js | sim |
| GET | `/api/m1/operational-adoption-enablement/esg` | sim | routes/m1OperationalAdoptionEnablementRoutes.js | sim |
| GET | `/api/m1/operational-adoption-enablement/foundation` | sim | routes/m1OperationalAdoptionEnablementRoutes.js | sim |
| GET | `/api/m1/operational-adoption-enablement/readiness` | sim | routes/m1OperationalAdoptionEnablementRoutes.js | sim |
| GET | `/api/m1/operational-adoption-enablement/status` | sim | routes/m1OperationalAdoptionEnablementRoutes.js | sim |
| GET | `/api/m1/operational-adoption-enablement/workflow` | sim | routes/m1OperationalAdoptionEnablementRoutes.js | sim |
| GET | `/api/m1/operational-roadmap/gaps` | sim | routes/m1OperationalRoadmapRoutes.js | sim |
| GET | `/api/m1/operational-roadmap/p0` | sim | routes/m1OperationalRoadmapRoutes.js | sim |
| GET | `/api/m1/operational-roadmap/p17-p20` | sim | routes/m1OperationalRoadmapRoutes.js | sim |
| GET | `/api/m1/operational-roadmap/roadmap` | sim | routes/m1OperationalRoadmapRoutes.js | sim |
| GET | `/api/m1/operational-roadmap/status` | sim | routes/m1OperationalRoadmapRoutes.js | sim |
| GET | `/api/m1/pilot-adoption-closure/environment` | sim | routes/m1PilotAdoptionClosureRoutes.js | sim |
| GET | `/api/m1/pilot-adoption-closure/gate` | sim | routes/m1PilotAdoptionClosureRoutes.js | sim |
| GET | `/api/m1/pilot-adoption-closure/maintenance` | sim | routes/m1PilotAdoptionClosureRoutes.js | sim |
| GET | `/api/m1/pilot-adoption-closure/status` | sim | routes/m1PilotAdoptionClosureRoutes.js | sim |
| GET | `/api/m1/pilot-adoption-closure/utilization` | sim | routes/m1PilotAdoptionClosureRoutes.js | sim |
| GET | `/api/m1/pilot-adoption/environment` | sim | routes/m1PilotAdoptionRoutes.js | sim |
| GET | `/api/m1/pilot-adoption/maintenance` | sim | routes/m1PilotAdoptionRoutes.js | sim |
| GET | `/api/m1/pilot-adoption/recommendation` | sim | routes/m1PilotAdoptionRoutes.js | sim |
| GET | `/api/m1/pilot-adoption/status` | sim | routes/m1PilotAdoptionRoutes.js | sim |
| GET | `/api/m1/pilot-adoption/utilization` | sim | routes/m1PilotAdoptionRoutes.js | sim |
| GET | `/api/m1/pilot-closure/environment` | sim | routes/m1PilotClosureRoutes.js | sim |
| GET | `/api/m1/pilot-closure/gate` | sim | routes/m1PilotClosureRoutes.js | sim |
| GET | `/api/m1/pilot-closure/maintenance` | sim | routes/m1PilotClosureRoutes.js | sim |
| GET | `/api/m1/pilot-closure/status` | sim | routes/m1PilotClosureRoutes.js | sim |
| GET | `/api/m1/pilot-execution/ceo` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/cfo` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/environment` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/hr` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/maintenance` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/navigation` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/safety` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-execution/status` | sim | routes/m1PilotExecutionRoutes.js | sim |
| GET | `/api/m1/pilot-operation/activity` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/environment` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/executive` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/financial` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/hr` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/maintenance` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/runtime` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/safety` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-operation/status` | sim | routes/m1PilotOperationRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/environment` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/executive` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/financial` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/hr` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/maintenance` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/safety` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/pilot-readiness/status` | sim | routes/m1PilotReadinessRoutes.js | sim |
| GET | `/api/m1/platform-closure/aioi-worker` | sim | routes/m1PlatformClosureRoutes.js | sim |
| GET | `/api/m1/platform-closure/financial` | sim | routes/m1PlatformClosureRoutes.js | sim |
| GET | `/api/m1/platform-closure/shadow-runtime` | sim | routes/m1PlatformClosureRoutes.js | sim |
| GET | `/api/m1/platform-closure/status` | sim | routes/m1PlatformClosureRoutes.js | sim |
| GET | `/api/m1/platform-closure/telemetry` | sim | routes/m1PlatformClosureRoutes.js | sim |
| GET | `/api/m1/validation/environment` | sim | routes/m1ValidationRoutes.js | sim |
| GET | `/api/m1/validation/executive` | sim | routes/m1ValidationRoutes.js | sim |
| GET | `/api/m1/validation/financial` | sim | routes/m1ValidationRoutes.js | sim |
| GET | `/api/m1/validation/hr` | sim | routes/m1ValidationRoutes.js | sim |
| GET | `/api/m1/validation/maintenance` | sim | routes/m1ValidationRoutes.js | sim |
| GET | `/api/m1/validation/safety` | sim | routes/m1ValidationRoutes.js | sim |
| GET | `/api/m1/validation/status` | sim | routes/m1ValidationRoutes.js | sim |
| POST | `/api/manuals/upload` | sim | routes/manuals.js | — |
| POST | `/api/manutencao-ia/conclude-session` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/emergency-events` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/health` | NÃO | routes/manutencao-ia.js | sim |
| POST | `/api/manutencao-ia/live-assistance/analyze-frame` | NÃO | routes/manutencao-ia.js | sim |
| POST | `/api/manutencao-ia/live-assistance/chat` | NÃO | routes/manutencao-ia.js | sim |
| POST | `/api/manutencao-ia/live-assistance/save-session` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/machines` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/machines/:id` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/machines/:id/diagnostic` | NÃO | routes/manutencao-ia.js | sim |
| POST | `/api/manutencao-ia/research-equipment` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/research-equipment/recent` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/sensors` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/manutencao-ia/sessions` | NÃO | routes/manutencao-ia.js | sim |
| POST | `/api/manutencao-ia/sessions` | NÃO | routes/manutencao-ia.js | sim |
| GET | `/api/media/file` | sim | routes/mediaFile.js | — |
| POST | `/api/mes/downtime` | sim | domains/mes/routes/mesRoutes.js | — |
| POST | `/api/mes/executions` | sim | domains/mes/routes/mesRoutes.js | — |
| GET | `/api/mes/health` | sim | domains/mes/routes/mesRoutes.js | — |
| POST | `/api/mes/oee` | sim | domains/mes/routes/mesRoutes.js | — |
| POST | `/api/mes/production-orders` | sim | domains/mes/routes/mesRoutes.js | — |
| POST | `/api/mes/scrap` | sim | domains/mes/routes/mesRoutes.js | — |
| POST | `/api/mes/traceability` | sim | domains/mes/routes/mesRoutes.js | — |
| GET | `/api/nexus-ia/providers-transparency` | sim | routes/nexusIa.js | sim |
| GET | `/api/onboarding/context` | sim | routes/onboarding.js | — |
| GET | `/api/onboarding/history` | sim | routes/onboarding.js | — |
| POST | `/api/onboarding/respond` | sim | routes/onboarding.js | — |
| POST | `/api/onboarding/start` | sim | routes/onboarding.js | — |
| GET | `/api/onboarding/status` | sim | routes/onboarding.js | — |
| GET | `/api/operational-anomalies` | sim | routes/operationalAnomalies.js | — |
| GET | `/api/operational-anomalies/:id` | sim | routes/operationalAnomalies.js | — |
| POST | `/api/operational-anomalies/:id/acknowledge` | sim | routes/operationalAnomalies.js | — |
| POST | `/api/operational-anomalies/alerts/:id/read` | sim | routes/operationalAnomalies.js | — |
| GET | `/api/operational-anomalies/alerts/list` | sim | routes/operationalAnomalies.js | — |
| GET | `/api/operational-anomalies/dashboard` | sim | routes/operationalAnomalies.js | — |
| GET | `/api/operational-anomalies/impact/forecasting` | sim | routes/operationalAnomalies.js | — |
| POST | `/api/operational-anomalies/run-cycle` | sim | routes/operationalAnomalies.js | — |
| POST | `/api/operational/confirm-action` | sim | routes/operational.js | sim |
| POST | `/api/operational/rollback-action` | sim | routes/operational.js | sim |
| GET | `/api/operations/active/ioe` | sim | routes/operations/activeContinuousOperationRoutes.js | sim |
| GET | `/api/operations/active/outbox` | sim | routes/operations/activeContinuousOperationRoutes.js | sim |
| GET | `/api/operations/active/runtime` | sim | routes/operations/activeContinuousOperationRoutes.js | sim |
| GET | `/api/operations/active/stability` | sim | routes/operations/activeContinuousOperationRoutes.js | sim |
| GET | `/api/operations/active/status` | sim | routes/operations/activeContinuousOperationRoutes.js | sim |
| GET | `/api/operations/continuous/health` | sim | routes/operations/continuousOperationRoutes.js | sim |
| GET | `/api/operations/continuous/observation` | sim | routes/operations/continuousOperationRoutes.js | sim |
| GET | `/api/operations/continuous/readiness` | sim | routes/operations/continuousOperationRoutes.js | sim |
| GET | `/api/operations/continuous/status` | sim | routes/operations/continuousOperationRoutes.js | sim |
| GET | `/api/operations/golive/24h` | sim | routes/operations/goLiveMonitoringRoutes.js | sim |
| GET | `/api/operations/golive/72h` | sim | routes/operations/goLiveMonitoringRoutes.js | sim |
| GET | `/api/operations/golive/acceptance` | sim | routes/operations/goLiveMonitoringRoutes.js | sim |
| GET | `/api/operations/golive/registry` | sim | routes/operations/goLiveMonitoringRoutes.js | sim |
| GET | `/api/operations/golive/status` | sim | routes/operations/goLiveMonitoringRoutes.js | sim |
| GET | `/api/operations/observation/ai` | sim | routes/operations/continuousOperationObservationRoutes.js | sim |
| GET | `/api/operations/observation/ingestion` | sim | routes/operations/continuousOperationObservationRoutes.js | sim |
| GET | `/api/operations/observation/platform` | sim | routes/operations/continuousOperationObservationRoutes.js | sim |
| GET | `/api/operations/observation/registry` | sim | routes/operations/continuousOperationObservationRoutes.js | sim |
| GET | `/api/operations/observation/status` | sim | routes/operations/continuousOperationObservationRoutes.js | sim |
| GET | `/api/operations/observation/workflows` | sim | routes/operations/continuousOperationObservationRoutes.js | sim |
| GET | `/api/operations/runtime/activation` | sim | routes/operations/runtimeStabilizationRoutes.js | sim |
| GET | `/api/operations/runtime/health` | sim | routes/operations/runtimeStabilizationRoutes.js | sim |
| GET | `/api/operations/runtime/registry` | sim | routes/operations/runtimeStabilizationRoutes.js | sim |
| GET | `/api/operations/runtime/stabilization` | sim | routes/operations/runtimeStabilizationRoutes.js | sim |
| GET | `/api/operations/runtime/status` | sim | routes/operations/runtimeStabilizationRoutes.js | sim |
| GET | `/api/plc-alerts` | sim | routes/plcAlerts.js | — |
| POST | `/api/plc-alerts/:id/acknowledge` | sim | routes/plcAlerts.js | sim |
| POST | `/api/plc-alerts/run-collector` | sim | routes/plcAlerts.js | — |
| POST | `/api/proacao` | sim | routes/proacao.js | sim |
| GET | `/api/proacao` | sim | routes/proacao.js | sim |
| GET | `/api/proacao/:id` | sim | routes/proacao.js | sim |
| PUT | `/api/proacao/:id` | sim | routes/proacao.js | sim |
| POST | `/api/proacao/:id/assign` | sim | routes/proacao.js | sim |
| POST | `/api/proacao/:id/enrich` | sim | routes/proacao.js | sim |
| POST | `/api/proacao/:id/escalate` | sim | routes/proacao.js | sim |
| POST | `/api/proacao/:id/evaluate` | sim | routes/proacao.js | sim |
| POST | `/api/proacao/:id/finalize` | sim | routes/proacao.js | sim |
| POST | `/api/proacao/:id/record` | sim | routes/proacao.js | sim |
| PATCH | `/api/proacao/:id/status` | sim | routes/proacao.js | sim |
| GET | `/api/pulse/admin/settings` | sim | routes/pulse.js | sim |
| PUT | `/api/pulse/admin/settings` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/hr/analytics` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/hr/campaigns` | sim | routes/pulse.js | sim |
| POST | `/api/pulse/hr/campaigns` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/hr/company-settings` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/hr/evaluations` | sim | routes/pulse.js | sim |
| POST | `/api/pulse/hr/report/:evaluationId` | sim | routes/pulse.js | sim |
| POST | `/api/pulse/hr/trigger` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/me/motivation` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/me/prompt` | sim | routes/pulse.js | sim |
| POST | `/api/pulse/me/start` | sim | routes/pulse.js | sim |
| POST | `/api/pulse/me/submit` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/mgmt/aggregates` | sim | routes/pulse.js | sim |
| POST | `/api/pulse/supervisor/:evaluationId/perception` | sim | routes/pulse.js | sim |
| GET | `/api/pulse/supervisor/pending` | sim | routes/pulse.js | sim |
| GET | `/api/quality-intelligence/alerts` | sim | routes/qualityIntelligence.js | — |
| POST | `/api/quality-intelligence/alerts/:id/acknowledge` | sim | routes/qualityIntelligence.js | — |
| GET | `/api/quality-intelligence/dashboard` | sim | routes/qualityIntelligence.js | — |
| GET | `/api/quality-intelligence/impact/forecasting` | sim | routes/qualityIntelligence.js | — |
| GET | `/api/quality-intelligence/indicators` | sim | routes/qualityIntelligence.js | — |
| GET | `/api/quality-intelligence/inspections` | sim | routes/qualityIntelligence.js | — |
| POST | `/api/quality-intelligence/inspections` | sim | routes/qualityIntelligence.js | — |
| GET | `/api/quality-intelligence/receipts` | sim | routes/qualityIntelligence.js | — |
| POST | `/api/quality-intelligence/receipts` | sim | routes/qualityIntelligence.js | — |
| POST | `/api/quality-intelligence/run-alerts` | sim | routes/qualityIntelligence.js | — |
| GET | `/api/raw-material-lots` | sim | routes/rawMaterialLots.js | — |
| GET | `/api/raw-material-lots/:id` | sim | routes/rawMaterialLots.js | — |
| PUT | `/api/raw-material-lots/:id/status` | sim | routes/rawMaterialLots.js | — |
| POST | `/api/raw-material-lots/alerts/:id/acknowledge` | sim | routes/rawMaterialLots.js | — |
| GET | `/api/raw-material-lots/alerts/list` | sim | routes/rawMaterialLots.js | — |
| GET | `/api/raw-material-lots/blocked` | sim | routes/rawMaterialLots.js | — |
| POST | `/api/raw-material-lots/run-cycle` | sim | routes/rawMaterialLots.js | — |
| GET | `/api/raw-material-lots/suppliers/ranking` | sim | routes/rawMaterialLots.js | — |
| POST | `/api/raw-material-lots/validate` | sim | routes/rawMaterialLots.js | — |
| POST | `/api/realtime-presence/perceive` | sim | routes/realtimePresence.js | sim |
| POST | `/api/realtime-presence/render` | sim | routes/realtimePresence.js | sim |
| POST | `/api/realtime-presence/session` | sim | routes/realtimePresence.js | sim |
| POST | `/api/role-verification/approve/:requestId` | sim | routes/roleVerification.js | sim |
| GET | `/api/role-verification/check-email` | sim | routes/roleVerification.js | sim |
| GET | `/api/role-verification/panel` | sim | routes/roleVerification.js | sim |
| GET | `/api/role-verification/pending-approvals` | sim | routes/roleVerification.js | sim |
| POST | `/api/role-verification/request-approval` | sim | routes/roleVerification.js | sim |
| GET | `/api/role-verification/status` | sim | routes/roleVerification.js | sim |
| POST | `/api/role-verification/upload-document` | NÃO | routes/roleVerification.js | sim |
| POST | `/api/role-verification/verify-email` | sim | routes/roleVerification.js | sim |
| GET | `/api/rollout-center/audit` | sim | routes/rolloutCenter.js | sim |
| GET | `/api/rollout-center/capabilities` | sim | routes/rolloutCenter.js | sim |
| GET | `/api/rollout-center/dashboard` | sim | routes/rolloutCenter.js | sim |
| GET | `/api/rollout-center/flags/effective` | sim | routes/rolloutCenter.js | sim |
| GET | `/api/rollout-center/gates` | sim | routes/rolloutCenter.js | sim |
| POST | `/api/rollout-center/gates/evaluate` | sim | routes/rolloutCenter.js | sim |
| GET | `/api/rollout-center/health` | sim | routes/rolloutCenter.js | sim |
| GET | `/api/runtime-unification/audit` | sim | routes/runtimeUnification.js | — |
| GET | `/api/runtime-unification/channels` | sim | routes/runtimeUnification.js | — |
| POST | `/api/runtime-unification/context/preview` | sim | routes/runtimeUnification.js | — |
| GET | `/api/runtime-unification/health` | sim | routes/runtimeUnification.js | — |
| GET | `/api/runtime-z-cognitive-os` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/actions` | sim | routes/runtimeZCognitiveOs.js | — |
| POST | `/api/runtime-z-cognitive-os/apply` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/cognition` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/context` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/continuity` | sim | routes/runtimeZCognitiveOs.js | — |
| POST | `/api/runtime-z-cognitive-os/ingest/conversation` | sim | routes/runtimeZCognitiveOs.js | — |
| POST | `/api/runtime-z-cognitive-os/ingest/entity` | sim | routes/runtimeZCognitiveOs.js | — |
| POST | `/api/runtime-z-cognitive-os/ingest/incident` | sim | routes/runtimeZCognitiveOs.js | — |
| POST | `/api/runtime-z-cognitive-os/ingest/task` | sim | routes/runtimeZCognitiveOs.js | — |
| POST | `/api/runtime-z-cognitive-os/ingest/workflow` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/memory` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/observability` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/reasoning` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/shadow-diff` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-cognitive-os/validation` | sim | routes/runtimeZCognitiveOs.js | — |
| GET | `/api/runtime-z-maturation` | sim | routes/runtimeZMaturation.js | — |
| POST | `/api/runtime-z-maturation/apply` | sim | routes/runtimeZMaturation.js | — |
| GET | `/api/runtime-z-maturation/calibration` | sim | routes/runtimeZMaturation.js | — |
| GET | `/api/runtime-z-maturation/observability` | sim | routes/runtimeZMaturation.js | — |
| GET | `/api/runtime-z-maturation/patterns` | sim | routes/runtimeZMaturation.js | — |
| GET | `/api/runtime-z-maturation/scenario` | sim | routes/runtimeZMaturation.js | — |
| POST | `/api/runtime-z-operational-nervous-system/apply` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/awareness` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/continuity` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/governance` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/health` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/metrics` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/observation` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/persistence/health` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/reintegration` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/reminders` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/tasks` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| POST | `/api/runtime-z-operational-nervous-system/validate` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| GET | `/api/runtime-z-operational-nervous-system/workflows` | sim | routes/runtimeZOperationalNervousSystem.js | — |
| POST | `/api/runtime-z-sovereign/apply` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/bootstrap` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/compose` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/context` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/fallback` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/hydrate` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/metrics` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/promotion` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/shadow-diff` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sovereign/validation` | sim | routes/runtimeZSovereign.js | — |
| GET | `/api/runtime-z-sz5/actors` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/continuity` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/followups` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/graph` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/health` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/meetings` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/memory` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/observability` | sim | routes/runtimeZSz5.js | — |
| POST | `/api/runtime-z-sz5/query` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/tasks` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/threads` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/timeline` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/runtime-z-sz5/workflows` | sim | routes/runtimeZSz5.js | — |
| GET | `/api/subscription/payment-link` | sim | routes/subscription.js | sim |
| GET | `/api/tasks` | sim | routes/tasks.js | sim |
| GET | `/api/technical-library/audit` | NÃO | routes/technicalLibrary.js | sim |
| DELETE | `/api/technical-library/documents/:id` | NÃO | routes/technicalLibrary.js | sim |
| GET | `/api/technical-library/equipments` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments` | NÃO | routes/technicalLibrary.js | sim |
| GET | `/api/technical-library/equipments/:id` | NÃO | routes/technicalLibrary.js | sim |
| PUT | `/api/technical-library/equipments/:id` | NÃO | routes/technicalLibrary.js | sim |
| DELETE | `/api/technical-library/equipments/:id` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments/:id/build-procedural-payload` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments/:id/build-unity-payload` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments/:id/documents` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments/:id/keywords` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments/:id/models` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/equipments/:id/parts` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/field-analysis` | NÃO | routes/technicalLibrary.js | sim |
| GET | `/api/technical-library/field-analysis/:id` | NÃO | routes/technicalLibrary.js | sim |
| GET | `/api/technical-library/health` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/import/csv` | NÃO | routes/technicalLibrary.js | sim |
| DELETE | `/api/technical-library/keywords/:id` | NÃO | routes/technicalLibrary.js | sim |
| PATCH | `/api/technical-library/models/:id` | NÃO | routes/technicalLibrary.js | sim |
| DELETE | `/api/technical-library/models/:id` | NÃO | routes/technicalLibrary.js | sim |
| PATCH | `/api/technical-library/models/:id/set-primary` | NÃO | routes/technicalLibrary.js | sim |
| PUT | `/api/technical-library/parts/:id` | NÃO | routes/technicalLibrary.js | sim |
| DELETE | `/api/technical-library/parts/:id` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/resolve/test` | NÃO | routes/technicalLibrary.js | sim |
| POST | `/api/technical-library/unity/build-visual-payload` | NÃO | routes/technicalLibrary.js | sim |
| GET | `/api/tpm/incidents` | sim | routes/tpm.js | sim |
| POST | `/api/tpm/incidents` | sim | routes/tpm.js | sim |
| GET | `/api/tpm/shift-totals` | sim | routes/tpm.js | sim |
| POST | `/api/tts` | sim | routes/tts.js | — |
| POST | `/api/tts/tts` | sim | routes/tts.js | — |
| GET | `/api/tts/tts.mp3` | sim | routes/tts.js | — |
| PUT | `/api/usuarios/foto` | sim | routes/usuarios.js | sim |
| POST | `/api/vision` | sim | routes/vision.js | — |
| POST | `/api/voz` | sim | routes/voz.js | sim |
| GET | `/api/voz/alertas` | sim | routes/voz.js | — |
| POST | `/api/voz/comando` | sim | routes/voz.js | — |
| POST | `/api/voz/conversa` | NÃO | routes/voz.js | — |
| GET | `/api/voz/status` | sim | routes/voz.js | — |
| POST | `/api/voz/transcrever` | NÃO | routes/voz.js | — |
| GET | `/api/warehouse-intelligence/alerts` | sim | routes/warehouseIntelligence.js | — |
| POST | `/api/warehouse-intelligence/alerts/:id/acknowledge` | sim | routes/warehouseIntelligence.js | — |
| GET | `/api/warehouse-intelligence/dashboard` | sim | routes/warehouseIntelligence.js | — |
| GET | `/api/warehouse-intelligence/idle-materials` | sim | routes/warehouseIntelligence.js | — |
| GET | `/api/warehouse-intelligence/impact/forecasting` | sim | routes/warehouseIntelligence.js | — |
| GET | `/api/warehouse-intelligence/indicators` | sim | routes/warehouseIntelligence.js | — |
| GET | `/api/warehouse-intelligence/predictions` | sim | routes/warehouseIntelligence.js | — |
| POST | `/api/warehouse-intelligence/run-alerts` | sim | routes/warehouseIntelligence.js | — |
| POST | `/api/webhook` | NÃO | routes/webhook.js | — |
| POST | `/api/webhooks/asaas` | NÃO | routes/webhooks/asaas.js | — |
| POST | `/api/workflow-engine/approvals/:id/approve` | sim | routes/workflowEngine.js | — |
| POST | `/api/workflow-engine/approvals/:id/reject` | sim | routes/workflowEngine.js | — |
| GET | `/api/workflow-engine/approvals/pending` | sim | routes/workflowEngine.js | — |
| GET | `/api/workflow-engine/definitions` | sim | routes/workflowEngine.js | — |
| GET | `/api/workflow-engine/health` | sim | routes/workflowEngine.js | — |
| GET | `/api/workflow-engine/instances/:id/audit` | sim | routes/workflowEngine.js | — |
| GET | `/api/workflow-engine/instances/:id/graph` | sim | routes/workflowEngine.js | — |
| POST | `/api/workflow-engine/instances/:id/recover` | sim | routes/workflowEngine.js | — |
| POST | `/api/workflow-engine/instances/:id/rollback` | sim | routes/workflowEngine.js | — |
| POST | `/api/workflow-engine/instances/:id/signal` | sim | routes/workflowEngine.js | — |
| POST | `/api/workflow-engine/instances/start` | sim | routes/workflowEngine.js | — |

---

### Próximos passos (manual, Partes 4–7)
- Preencher coluna **Flags** por endpoint com o estado efetivo (`dumpEffectiveFlags.js`).
- Executar cenários **E2E** por domínio e anexar as 6 evidências.
- Reclassificar `NAO_VALIDADO` → VERDE/AMARELO/MOCK/INCOMPLETO conforme execução.
## Cenários certificados (Parte 7.2 E2E)

> Atualizado por `applyCertEvidenceToMatrix.js` — não sobrescrever com buildFunctionalMatrix.

### Quality: NC → CAPA → Auditoria

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/quality/nc-create/` |
| Validado em | 2026-06-21 |
| Run ID | cert-1782077258269 |
| Isolamento tenant | OK (HTTP 403) |
| Gap UI | QualityGovernanceHub / NcrCapaPanel → **INCOMPLETO** |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Registrar NC (inspeção não conforme) | `POST /api/quality-intelligence/inspections` | VERDE |
| Instanciar workflow NCR universal | `POST /api/internal/quality-universal/workflows/instance` | VERDE |
| Transição NCR submit → quality.ncr.opened | `POST /api/internal/quality-universal/workflows/transition` | VERDE |
| Instanciar CAPA vinculada à NC | `POST /api/internal/quality-universal/workflows/instance` | VERDE |
| Transição CAPA submit → quality.capa.created | `POST /api/internal/quality-universal/workflows/transition` | VERDE |

### SST: Incidente / Quase-acidente / Treinamento vencido

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/safety/lifecycle/` |
| Validado em | 2026-06-21 |
| Run ID | cert-sst-1782078195593 |
| Isolamento tenant | OK (HTTP 200) |
| Gap UI | SafetyOperationalWorkspace (view=incident) → **INCOMPLETO** |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Registrar incidente SST | `POST /api/safety-operational/events` | VERDE |
| Registrar quase-acidente | `POST /api/safety-operational/events` | VERDE |
| Treinamento vencido + alerta HR | `POST /api/safety-operational/events` | VERDE |
| Listar alertas (Notification Center / Cérebro Operacional) | `GET /api/dashboard/operational-brain/alerts` | VERDE |

### Executive: Dashboard executivo por perfil

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/executive/dashboard-profile/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |
| Isolamento tenant | OK (HTTP —) |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Perfil + KPIs executivos | `GET /api/dashboard/me` | VERDE |
| KPIs tenant-scoped | `GET /api/dashboard/kpis` | VERDE |

### ManuIA: Diagnóstico → OS → Histórico

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/manuia/diagnosis-workorder/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Concluir sessão + criar OS | `POST /api/manutencao-ia/conclude-session` | VERDE |
| Histórico sessões | `GET /api/manutencao-ia/sessions` | VERDE |

### ESG: Emissão / Resíduo / Consumo

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/esg/emission-waste-consumption/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Alerta emissão | `POST /api/environment-operational/events` | VERDE |
| Manifesto resíduo | `POST /api/environment-operational/events` | VERDE |
| Amostra água/consumo | `POST /api/environment-operational/events` | VERDE |

### TPM: Plano preventivo → execução → indicador

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/tpm/preventive-lifecycle/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Criar preventiva | `POST /api/dashboard/maintenance/preventives` | VERDE |
| Concluir preventiva | `PATCH /api/dashboard/maintenance/preventives/:id` | VERDE |
| Indicadores summary | `GET /api/dashboard/maintenance/summary` | VERDE |

### DSR/LGPD: Pedido do titular

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/dsr/data-subject-request/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |
| Isolamento tenant | OK (HTTP 200) |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Criar pedido LGPD | `POST /api/lgpd/data-request` | VERDE |
| Processar pedido (DPO) | `PATCH /api/lgpd/data-requests/:id` | VERDE |

### Billing: Webhook Asaas / subscrição

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/billing/asaas-webhook/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Webhook PAYMENT_CONFIRMED | `POST /api/webhooks/asaas` | VERDE |

### Event Governance: Evento → política → decisão

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/governance/event-policy-decision/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Produtor SST | `POST /api/safety-operational/events` | VERDE |
| Audit status EG | `GET /api/audit/event-governance/status` | VERDE |
| Audit SST lifecycle | `GET /api/audit/event-governance/sst` | VERDE |

### AIOI: Correlação → Insight → Escalonamento

| Campo | Valor |
|-------|-------|
| Status | **VERDE** |
| Evidência | `backend/docs/evidence/aioi/correlation-insight/` |
| Validado em | 2026-06-21 |
| Run ID | cert-p72-1782079418244 |

| Fluxo | Endpoint | Status |
|-------|----------|--------|
| Eventos correlacionados (×3) | `POST /api/safety-operational/events` | VERDE |
| Audit AIOI | `GET /api/audit/event-governance/aioi` | VERDE |

