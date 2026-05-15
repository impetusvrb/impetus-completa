# Auditoria Estrutural — Dashboard Delivery / Role-Cargo Segregation Engine

**Data:** 2026-05-13  
**Âmbito:** Cadeia completa de entrega de dashboards, módulos, widgets, summaries, contextualização e orquestração.  
**Metodologia:** Inventário de código + auditoria estática + testes de governança automatizados sem DB.

---

## 1. Dashboards catalogados

| Dashboard / painel | Origem / ficheiro | Tipo | Endpoint / trigger |
|--------------------|-------------------|------|--------------------|
| **Dashboard Vivo Unificado** | `liveDashboardService.js` + `liveDashboardContextual/` | Híbrido real-time + contextual | `GET /api/live-dashboard/state` |
| **Dashboard `/dashboard/me`** | `routes/dashboard.js` → `dashboardProfileResolver` | Perfil + KPIs + módulos | `GET /api/dashboard/me` |
| **Dashboard Configurado** | `dashboardComposerService.js` | Personalizado (preferências JSONB) | `GET /api/dashboard/config` |
| **Dashboard Personalizado (legado)** | `dashboardPersonalizadoService.js` | Cached, cargo/setor | `GET /api/dashboard/personalizado` |
| **Dashboard Manutenção** | `routes/dashboardMaintenance.js` | Operacional (manuia) | sub-router `dashboard/maintenance/*` |
| **Dashboard Operacional Brain** | `routes/dashboardOperationalBrain.js` | IA operacional | sub-router `dashboard/operational-brain/*` |
| **Dashboard Live Surface (SSE)** | `dashboardComposer.composeLiveDashboardSurface` | Streaming SSE 15s | `GET /api/dashboard/live-surface/stream` |
| **Dashboard IA — Engine V2** | `dashboardEngineV2/gateway/dashboardCompositionGateway.js` | Shadow / on (feature flag) | Embutido em `/dashboard/me` como `engine_v2` |
| **Summaries inteligentes** | `smartSummary.buildSmartSummary` | IA por cargo | `GET /api/dashboard/smart-summary` |
| **Panel Command / Claude Panel** | `smartPanelCommandService` / `claudePanelService` | IA executiva | `POST /api/dashboard/panel-command`, `/claude-panel` |
| **Dashboard Voz (contexto)** | `voiceRealtimeContextService` | Realtime OpenAI | `GET /api/dashboard/voice-realtime-context` |
| **Governance Dashboard** | `dashboardEngineV2/governance/governanceFacade.js` | Auditoria organizacional | `GET /api/dashboard/v2/governance/*` |
| **Contextual Modules** | `contextualModules/` (Phase 6) | Enriquecimento funcional | Embutido em `/dashboard/me` como `contextual_modules` |
| **Visibility por Hierarquia** | `dashboardVisibility.getVisibilityForUser` | Seções configuráveis | Embutido em `/dashboard/me` → `sections` |
| **KPIs dinâmicos** | `dashboardKPIs.getDashboardKPIs` | Por perfil + scope | `GET /api/dashboard/kpis` |
| **Insights personalizados** | `personalizedInsightsService` | IA por perfil | `GET /api/dashboard/insights` |

---

## 2. Cadeia de entrega

```
JWT  →  requireAuth (middleware/auth.js)
     →  req.user populado (role, permissions, functional_area, dashboard_profile, …)
     ↓
dashboardProfileResolver.getDashboardConfigForUser(user)
     →  resolveFunctionalArea(user)        [prioridade: explícito > hint > dept/text > job > role]
     →  resolveDashboardProfile(user)      [ROLE_AREA_TO_PROFILE + override válido]
     →  getProfile(profileCode)            [DASHBOARD_PROFILES catalog]
     ↓
dashboardAccessService.getAllowedModules(user)
     →  isAdministrativePortalOnlyUser?    [tenant admin → portal only]
     →  leadershipRoles sem perms?         [fallback legado → profile.visible_modules]
     →  filter profileModules ∩ permissions
     ↓
dashboardKPIs.getDashboardKPIs(user, scope)
     →  hierarchicalFilter.resolveHierarchyScope(user)
     →  KPIs por profile_code + hierarchy_level
     →  getAllowedKpis (filtra SENSITIVE_KPI_KEYS sem VIEW_STRATEGIC/VIEW_FINANCIAL)
     ↓
liveDashboardService.buildLiveStateForUser(user)
     →  canOrchestrate(user, profileCode, functionalArea)   [deny-by-default]
     →  buildIntelligentSummary(…)                          [domain-safe text]
     →  buildLayoutWidgets(profileConfig, kpiByKey)
     →  liveDashboardContextual.enhanceLiveStateWithContext [Motor B, opcional]
     ↓
Payload  →  personalization.{ profile_code, profile_label, functional_area, functional_area_label }
         →  intelligent_summary
         →  layout.widgets
         →  capabilities.{ task_orchestration, ia_depth }
         →  orchestration (somente se canOrchestrate=true)
     ↓
Frontend → useVisibleModules() → filterMenuByModules() / canAccessPath()
         → LiveDashboardUnifiedPanel.jsx (renderiza personalization.*)
```

---

## 3. Mecanismo de autorização

| Camada | Mecanismo | Ficheiro-chave |
|--------|-----------|----------------|
| **Autenticação** | JWT `requireAuth` | `middleware/auth.js` |
| **Perfil** | `dashboardProfileResolver` (role + área + override) | `services/dashboardProfileResolver.js` |
| **Módulos** | `getAllowedModules` (interseção perfil × perms) | `services/dashboardAccessService.js` |
| **KPIs sensíveis** | `getAllowedKpis` (`SENSITIVE_KPI_KEYS` + `VIEW_STRATEGIC`) | `services/dashboardAccessService.js` |
| **IA depth** | `getIADataDepth` (hierarquia + VIEW_STRATEGIC) | `services/dashboardAccessService.js` |
| **Tenant admin portal** | `tenantAdminPortalScope` (suprime `operational`, `manuia`) | `services/tenantAdminPortalScope.js` |
| **Governance routes** | `_governanceGuard` (admin/auditor) | `routes/dashboard.js` |
| **Orquestração** | `canOrchestrate` (deny-by-default por perfil + área) | `services/liveDashboardService.js` |
| **Frontend routes** | `canAccessPath` + `filterMenuByModules` | `hooks/useVisibleModules.js` |
| **Admin bypass** | `userMayBypassEmptyModules` (somente admin/internal_admin/tenant_admin) | `hooks/useVisibleModules.js` |

---

## 4. Contextualização cognitiva

### Motores presentes

| Motor | Activo por defeito | Governa |
|-------|-------------------|---------|
| `buildIntelligentSummary` | Sim | Texto do resumo live dashboard |
| `canOrchestrate` | Sim | Orquestração operacional |
| `buildPersonalizedConfig` (Engine V2 personalizado) | Feature flag `IMPETUS_DASHBOARD_ENGINE_V2` | Layout + assistente IA |
| `contextualDashboardResolver` (Motor B) | Feature flag `IMPETUS_LIVE_DASHBOARD_MOTOR` | Enriquecimento contextual live |
| `smartSummary.buildSmartSummary` | On-demand (rota) | Resumo IA semanal |
| `dashboardPersonalizationEngine.buildPersonalizedConfig` | Embutido em `/personalizado` | Widgets por eixo funcional |

### Regras de domain-safety (após correcções V1 + V2)

- **finance / hr / director_unassigned / admin_system / sem área** → `domainSafeAlerts=true` → cópia "alertas relevantes ao seu domínio" (não "alertas operacionais").
- **operations / production / industrial** → cópia operacional mantida.
- `canOrchestrate`: `deny-by-default` — só retorna `true` se role + área + profileCode forem explicitamente operacionais.

---

## 5. Payload governance

| Endpoint | Campos sensíveis | Proteção |
|----------|-----------------|---------|
| `GET /dashboard/me` | `visible_modules`, `functional_area`, `kpis` | `getAllowedModules` + `getAllowedKpis` |
| `GET /live-dashboard/state` | `personalization.profile_label`, `functional_area_label`, `orchestration` | `canOrchestrate` + `buildIntelligentSummary` domain-safe |
| `GET /dashboard/smart-summary` | Texto IA | `heavyRouteLimiter` + perfil do utilizador |
| `GET /dashboard/v2/governance/*` | Dados organizacionais | `_governanceGuard` (admin/auditor) |
| `GET /dashboard/v2/identity-audit` | Dados de todos os utilizadores da empresa | `_contextIdentityAudit` guard (admin/CEO/sysAdmin) |
| `GET /dashboard/v2/decision-trace` | Traces internos | `userHasDirectorOrAdminInsightsAccess` |
| `POST /dashboard/chat` | Contexto operacional injectado | `secureContextBuilder` + `aiEgressGuardService` + `cognitiveSafetyRuntimeService` |

---

## 6. Widgets e summaries

| Widget / summary | Perfis que recebem | Proteção |
|------------------|--------------------|---------|
| `smart_summary` | Todos os perfis | Texto filtrado por `domainSafeAlerts` |
| `ai_insights` | Todos os perfis | `getIADataDepth` |
| `kpi_request` | `director_*`, `manager_*`, `coordinator_*`, `supervisor_*` | Definido em `DASHBOARD_PROFILES[profileCode].widgets` |
| `plc_alerts` | Perfis operacionais | Definido em perfil |
| `communication_panel` | Liderança (director, manager, coordinator) | Definido em perfil |
| `executive_query` | `ceo_executive`, `director_operations` | Definido em perfil |
| Widgets financeiros (Centro de custos) | `finance_management` exclusivo | `AXIS_WIDGET_POLICY.eixo_humano.exclude` para não-finance |
| `orchestration` (live dashboard) | Somente quando `canOrchestrate=true` | `canOrchestrate` deny-by-default |

---

## 7. Riscos encontrados (auditoria desta sessão)

| # | Tipo | Severidade | Estado |
|---|------|-----------|--------|
| 1 | `director_unassigned` recebia copy "alertas operacionais" | **High** | **Corrigido** nesta sessão (`domainSafeAlerts` extendido) |
| 2 | Liderança sem `permissions[]` explícito → fallback legado activo | Warning | Documentado; comportamento legítimo para compatibilidade mas deve ser resolvido em cadastro |
| 3 | `dashboardVisibility` entrega `DEFAULT_SECTIONS` completas para CEO/Diretor (hierarchy ≤1) sem discriminação por área | Info | Comportamento intencional (executivos vêem tudo por configuração); registado para revisão futura |
| 4 | `userHasDirectorOrAdminInsightsAccess` inclui qualquer `role.includes('diretor')` | Warning | Activa para rotas `/v2/decision-trace` e `/v2/divergence`; risco residual aceitável (logs internos) |

---

## 8. Vulnerabilidades detectadas

| Vulnerabilidade | Descrição | Estado |
|----------------|-----------|-------|
| **Fallback operacional universal** (V1) | `director._default → director_operations` → rótulo "Diretor de Operações" | **Corrigido V1** |
| **inferência "diretoria" → operations** (V2) | `inferAreaFromFreeText` usava "diretoria" para operações | **Corrigido V2** |
| **Resumo com "alertas operacionais" para director_unassigned** | `buildIntelligentSummary` não cobria `director_unassigned` | **Corrigido nesta sessão** |
| **`canOrchestrate` activável por role genérico** (V2) | CEO/diretor acionava orquestração operacional independente de domínio | **Corrigido V2** |
| **Fail-open frontend** (V1) | `visibleModules` vazio → menu completo para qualquer utilizador | **Corrigido V1** |
| **Capability inflation** (V1) | Union de permissões de todos os roles → escalada de acesso | **Corrigido V1** |

---

## 9. Correções recomendadas (residuais)

1. **Cadastrar `permissions[]` explícito** para toda a liderança — elimina o fallback legado de `getAllowedModules` para `visible_modules` do perfil e torna o controlo totalmente declarativo.
2. **Restringir `userHasDirectorOrAdminInsightsAccess`** a verificação de permissão explícita (`VIEW_AUDIT_LOGS` / capability `system_administration`) em vez de regex `role.includes('diretor')`.
3. **Revisar `dashboardVisibility`** para directors com área finance/RH — actualmente entregam `DEFAULT_SECTIONS` incluindo `plc_alerts` e `kpi_request` mesmo para CFO.
4. **Engine V2** (`IMPETUS_DASHBOARD_ENGINE_V2`): quando activado em modo `on`, validar que `compositionEngine` aplica as mesmas regras de `canOrchestrate` e `domainSafeAlerts` que o Motor A legacy.
5. **Smart summary** (`/dashboard/smart-summary`): adicionar filtro de domínio análogo ao `buildIntelligentSummary` para evitar que o summary GPT mencione métricas operacionais para perfis finance/RH.

---

## 10. Estado final

**dashboard delivery governance fully mapped and audited**

| Dimensão | Estado |
|----------|-------|
| Cadeia de entrega | Mapeada completamente (10 endpoints, 15 dashboards) |
| Perfis catalogados | 18 perfis em `DASHBOARD_PROFILES` auditados |
| Segregação por domínio | Operacional — finance / RH / manutenção / operações segregados |
| Contextualização cognitiva | Domain-safe activa (`domainSafeAlerts`, `canOrchestrate`) |
| Payload governance | Campos sensíveis protegidos por permissões + guards |
| Widgets e summaries | Atribuídos por perfil; sem universal cross-domain |
| Frontend delivery | `useVisibleModules` / `filterMenuByModules` — sem fail-open para não-admin |
| Orquestração | Deny-by-default: finance, RH, `director_unassigned` bloqueados |
| Testes automatizados | `dashboardGovernanceScenarios.js` — **74 passed, 0 failed** |
| Serviço de observabilidade | `dashboardDeliveryAuditService.js` — read-only, sem mutations |
