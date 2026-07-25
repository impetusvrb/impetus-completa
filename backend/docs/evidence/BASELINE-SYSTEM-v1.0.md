# BASELINE-SYSTEM v1.0 — Arquitetura Homologada Global do IMPETUS

**Identificador:** `BASELINE-SYSTEM-v1.0`  
**Data de congelamento:** 2026-07-16  
**Modo:** homologação arquitetural read-only (sem alterações de código)  
**Estado:** `SYSTEM_BASELINE_v1.0 = LOCKED`

---

## Declaração canónica

Este documento é o **índice mestre e referência arquitetural única** do IMPETUS após homologação dos domínios e superfícies core (INC-010 → INC-034).

> **Nenhuma evolução futura poderá alterar componentes homologados sem nova INC explícita, auditoria, regressão completa e actualização de baseline.**

**Relatório de homologação:** [SYSTEM-ARCHITECTURE-HOMOLOGATION.md](SYSTEM-ARCHITECTURE-HOMOLOGATION.md)

---

## Critérios de encerramento (SYSTEM v1.0)

| Flag | Valor |
|------|-------|
| `SYSTEM_BASELINE_v1.0` | **LOCKED** |
| `ALL_APPROVED_BASELINES_REGISTERED` | **YES** |
| `ARCHITECTURE_CANONICAL` | **YES** |
| `RUNTIME_INVENTORY_COMPLETE` | **YES** |
| `SURFACE_INVENTORY_COMPLETE` | **YES** |
| `ALL_LOCKED_COMPONENTS_DOCUMENTED` | **YES** |
| `ALL_GREENFIELDS_DOCUMENTED` | **YES** |
| `ALL_ARCHITECTURAL_DEBTS_REGISTERED` | **YES** |

---

## Índice mestre — Baselines aprovados

| Baseline | Estado | Documento | Notas |
|----------|--------|-----------|-------|
| **BASELINE_UI_v1.0** | **LOCKED** | [BASELINE-UI-v1.0.md](BASELINE-UI-v1.0.md) | Shell CentroComando desktop (INC-014→021) |
| **BASELINE_DASHBOARDS_v1.0** | **LOCKED** | [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md) | 52 perfis; matriz área×runtime×surface |
| **BASELINE_EXECUTIVE_v1.0** | **LOCKED** | [BASELINE-EXECUTIVE-v1.0.md](BASELINE-EXECUTIVE-v1.0.md) | `executive_boardroom` Z27 |
| **BASELINE_PRODUCTION_v1.0** | **LOCKED** | [BASELINE-PRODUCTION-v1.0.md](BASELINE-PRODUCTION-v1.0.md) | `production_native` ZP0 |
| **BASELINE_MAINTENANCE_v1.0** | **LOCKED** | [BASELINE-MAINTENANCE-v1.0.md](BASELINE-MAINTENANCE-v1.0.md) | `maintenance_native` ZM1; DashboardMecanico |
| **BASELINE_ENVIRONMENT_v1.0** | **LOCKED** | [BASELINE-ENVIRONMENT-v1.0.md](BASELINE-ENVIRONMENT-v1.0.md) | `environmental_native` P1 |
| **BASELINE_HR_v1.0** | **LOCKED** | [BASELINE-HR-v1.0.md](BASELINE-HR-v1.0.md) | `hr_native` Z26 |
| **BASELINE_SAFETY_v1.0** | **LOCKED** | [BASELINE-SAFETY-v1.0.md](BASELINE-SAFETY-v1.0.md) | `safety_native` Z25 (SST) |
| **BASELINE_QUALITY_v1.1** | **LOCKED** | [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | `quality_native` Z22+Z23; INC-022→034 |
| **BASELINE_QUALITY_v1.0** | **SUPERSEDED** | [BASELINE-QUALITY-v1.0.md](BASELINE-QUALITY-v1.0.md) | Substituído por v1.1 |
| **BASELINE_LOGISTICS_v1.0** | **LOCKED** | [BASELINE-LOGISTICS-v1.0.md](BASELINE-LOGISTICS-v1.0.md) | Sem runtime nativo |
| **BASELINE_SUPPLY_v1.0** | **LOCKED** | [BASELINE-SUPPLY-v1.0.md](BASELINE-SUPPLY-v1.0.md) | Colapsado em logística |
| **SECURITY_BASELINE_01** | **LOCKED** | [security-baseline-01/SECURITY_BASELINE_01.md](security-baseline-01/SECURITY_BASELINE_01.md) | Superfície segurança infra (2026-07-03) |
| **IMPETUS_SECURITY_RECON** | **LOCKED** | [../IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md](../IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md) | Anti-recon runtime (Fase 005/006) |
| **SEC_VISUAL_INTELLIGENCE_001** | **LOCKED** | [admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md](admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md) | Centro de Segurança (admin-portal) |
| **BASELINE_PORTAL_ADMIN** | **PARTIAL** | [admin-portal-security/](admin-portal-security/) | SOC certificado; portal geral parcial |
| **CEO_BASELINE_V1** | **LOCKED** | [CEO_BASELINE_V1.md](CEO_BASELINE_V1.md) | Baseline executivo CEO |

### Estado global consolidado

| Dimensão | Estado |
|----------|--------|
| UI Shell CC | **LOCKED** |
| Dashboards organizacionais | **LOCKED** (débitos P-* documentados) |
| Cross-surface contamination | **PARTIAL** (P-ENV-001) |
| Runtime resolution | **PARTIAL** (logistics/supply greenfield) |
| Quality domain | **LOCKED v1.1** |
| Security infra + recon | **LOCKED** |

---

## Etapa 1 — Inventário geral da arquitetura

### Frontend (`frontend/src/`)

| Camada | Localização canónica | Função |
|--------|---------------------|--------|
| **Centro de Comando** | `features/dashboard/centroComando/` | Superfície principal multi-domínio |
| **Context adapter** | `features/dashboard/contextAdapter/` | `dashboardContextAdapter`, `useDashboardContext` |
| **Surface capabilities** | `utils/dashboardSurfaceCapabilities.js` | Fail-closed INC-009/022 |
| **Cognitive resolvers** | `cognitiveRuntime/cockpit/specializedCockpitResolver.js` | Z.23 payload → UI |
| **Domain resolvers** | `cognitiveRuntime/domains/*/` | executive, production, hr, safety, environmental, maintenance |
| **Promotion engine** | `features/dashboard/centroComando/QualityNativeCockpitPromotion.jsx` | Único hub promotion CC homologado |
| **Adapters homologados** | `features/dashboard/centroComando/qualityCommandCenterKpiAdapter.js` | INC-032 |
| **Quality domain** | `domains/quality/` | Governance, Telemetry, Cognitive, Operational |
| **Environment domain** | `domains/environment/` | Navigation, publication runtime |
| **Safety / Logistics** | `domains/safety/`, `domains/logistics/` | Navigation + visibility |
| **Runtime boot** | `runtimeBoot/dashboardMeSharedStore.js` | Cache `/dashboard/me` |
| **Design system** | `styles/tokens.css`, `styles.css` | Industrial 4.0 DS |
| **Charts canónicos** | `components/charts/` | ImpetusChart, chartTheme |

### Backend (`backend/src/`)

| Camada | Localização canónica | Função |
|--------|---------------------|--------|
| **Server entry** | `server.js` | Express, middleware chain, PM2 |
| **Dashboard API** | `routes/dashboard.js` | `/dashboard/me`, kpis, summary |
| **Cognitive facade** | `cognitiveRuntime/facade/cognitiveRuntimeFacade.js` | Z.19–Z.29 orquestração |
| **Signal loaders** | `cognitiveRuntime/bridge/*TenantSignalLoader.js` | Z.20 por domínio |
| **Domain adapters** | `cognitiveRuntime/domainAdapters/` | Z.21 metrics, KPIs |
| **Cockpit consolidation** | `cognitiveRuntime/cockpitConsolidation/` | Z.23 centers |
| **Profile resolver** | `services/dashboardProfileResolver.js` | 52 profile_codes |
| **Module resolver** | `services/structuralModuleResolver.js` | visible_modules |
| **Module registry** | `contextualModules/moduleRegistry.js` | menu_key governance |
| **Dashboard KPIs** | `services/dashboardKPIs.js` | KPI layer CC |
| **Quality intelligence** | `services/qualityIntelligenceService.js` | NC/CAPA, inspections |
| **Quality governance** | `domains/quality/governance/` | SPC, drift, analytics |
| **Security recon** | `securityRecon/` | Anti-recon middleware |
| **Admin portal APIs** | `services/adminPortalSecurity*.js` | SOC, evidence, intelligence |
| **Telemetry storage** | `storage/telemetryIsolationService.js` | `telemetry_timeseries_v1` |

### Portal Admin (`admin-portal/`)

| Camada | Localização | Função |
|--------|-------------|--------|
| **Security Center** | `src/pages/SecurityDashboard.jsx` | SOC homologado SEC-SVI-001 |
| **SOC components** | `src/components/soc/` | Mapa, drilldown, rails |
| **Admin auth** | backend `middleware/adminPortalAuth.js` | JWT admin separado |

---

## Etapa 3 — Runtime Inventory (cognitivos nativos)

| Runtime ID | Camada | Estado | Flag env (exemplo) | CC Promotion | Baseline |
|------------|--------|--------|-------------------|--------------|----------|
| `executive_boardroom` | Z27 | **ACTIVE** | `IMPETUS_EXECUTIVE_BOARDROOM=on` | NO | EXECUTIVE v1.0 |
| `production_native` | ZP0 | **ACTIVE** | `IMPETUS_PRODUCTION_NATIVE_COCKPIT=on` | NO | PRODUCTION v1.0 |
| `maintenance_native` | ZM1 | **ACTIVE** | `IMPETUS_MAINTENANCE_NATIVE_COCKPIT=on` | N/A (DashboardMecanico) | MAINTENANCE v1.0 |
| `quality_native` | Z22+Z23 | **LOCKED** | `IMPETUS_QUALITY_NATIVE_COCKPIT=on` | **YES** | QUALITY v1.1 |
| `environmental_native` | P1 | **ACTIVE** | `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT=on` | NO | ENVIRONMENT v1.0 |
| `hr_native` | Z26 | **ACTIVE** | `IMPETUS_HR_NATIVE_COCKPIT=on` | NO | HR v1.0 |
| `safety_native` | Z25 | **ACTIVE** | `IMPETUS_SST_NATIVE_COCKPIT=on` | NO | SAFETY v1.0 |
| `logistics_native` | — | **GREENFIELD** | — | NO | LOGISTICS v1.0 |
| `supply_native` | — | **GREENFIELD** | — | NO | SUPPLY v1.0 |
| `finance_native` | — | **GREENFIELD** | — | NO | — |

**Render promotion global:** `IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled`

### Fases runtime transversais (backend)

| Fase | Responsabilidade | Estado |
|------|------------------|--------|
| Z.19 | Feature flags runtime | LOCKED config |
| Z.20 | Engine bridge + signal loaders | LOCKED (quality INC-028) |
| Z.21 | Operational metrics + insights | LOCKED |
| Z.22 | Render promotion | LOCKED |
| Z.23 | Specialized cockpit consolidation | LOCKED |
| C3–C6 | Authority, truth, convergence, governance | ACTIVE |
| Security Recon | Pre/post-auth guard | LOCKED |

---

## Etapa 4 — Superfícies protegidas

| Superfície | Perfis | Modificável sem INC? | Baseline |
|------------|--------|----------------------|----------|
| **CentroComando** | Default multi-domínio | **NÃO** (shell UI v1.0) | UI + DASHBOARDS |
| **DashboardMecanico** | Manutenção | **NÃO** (superfície segregada) | MAINTENANCE |
| **DashboardOperador** | `operator_floor` | **NÃO** (layout chão) | PRODUCTION |
| **Quality Native hubs** | quality profiles | **NÃO** (adapters INC-031/032/033) | QUALITY v1.1 |
| **Portal Admin — SOC** | admin JWT | **NÃO** (SEC-SVI-001) | SEC_VISUAL |
| **Security Recon middleware** | global | **NÃO** | SEC_RECON |
| **Cognitive Core strip** | todos CC | **NÃO** (INC-014→021) | UI v1.0 |
| **Whisper omnipresence** | todos CC | **NÃO** (INC-017→020) | UI v1.0 |

### Matriz de segregação (fail-closed)

Documentada em [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md) § Segregação cross-domain.  
Implementação: `dashboardSurfaceCapabilities.js` + INC-022.

---

## Etapa 5 — Cadeia arquitetural oficial

```
Cadastro Estrutural
  (users + structural_profile + functional_area + department)
        ↓
Auth / Session / RBAC
  (middleware/auth.js, hierarchicalFilter, domain axis)
        ↓
GET /api/dashboard/me
  (routes/dashboard.js → cognitiveRuntimeFacade)
        ↓
Z.19 Feature Flags
        ↓
Z.20 Signal Loaders + Engine Bridge
  (qualityTenantSignalLoader, production*, maintenance*, …)
        ↓
Z.21 Domain Adapters
  (qualityOperationalMetrics, insights, KPI adapters)
        ↓
Z.22 Render Promotion
  (cognitive_render_promotion — controlled)
        ↓
Z.23 Consolidation
  (specialized_cockpit_runtime + centers)
        ↓
dashboardSurfaceCapabilities
  (fail-closed surface selection)
        ↓
Dashboard.jsx → Surface Router
  (CentroComando | DashboardMecanico | DashboardOperador)
        ↓
dashboardContextAdapter.buildDashboardContext()
  (multi-runtime priority merge)
        ↓
LayoutPorCargo + Widgets
        ↓
Native Promotion (QualityNativeCockpitPromotion — INC-024)
        ↓
Domain Hubs
  (GovernanceHub, TelemetryHub, CognitiveHub, …)
        ↓
Domain Adapters (frontend)
  (KPI, SPC, Cognitive signal adapters)
        ↓
APIs oficiais + datasets BD
```

**Esta cadeia é arquitetura oficial v1.0.** Qualquer atalho (mock, bypass, payload sintético) fora de adapters homologados é proibido.

---

## Etapa 6 — Componentes congelados

| Componente | Classificação | Path |
|------------|---------------|------|
| `dashboardProfileResolver` | **LOCKED** | `backend/src/services/dashboardProfileResolver.js` |
| `dashboardSurfaceCapabilities` | **LOCKED** | `frontend/src/utils/dashboardSurfaceCapabilities.js` |
| `structuralModuleResolver` | **LOCKED** | `backend/src/services/structuralModuleResolver.js` |
| `moduleRegistry` | **LOCKED** | `backend/src/contextualModules/moduleRegistry.js` |
| `cognitiveRuntimeFacade` | **LOCKED** | `backend/src/cognitiveRuntime/facade/cognitiveRuntimeFacade.js` |
| `specializedCockpitResolver` | **LOCKED** | `frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js` |
| `dashboardContextAdapter` | **LOCKED** | `frontend/src/features/dashboard/contextAdapter/` |
| `QualityNativeCockpitPromotion` | **LOCKED** | `frontend/.../QualityNativeCockpitPromotion.jsx` |
| `qualityTenantSignalLoader` | **LOCKED** | `backend/.../qualityTenantSignalLoader.js` |
| `qualityCommandCenterKpiAdapter` | **LOCKED** | `frontend/.../qualityCommandCenterKpiAdapter.js` |
| `qualityCognitiveRuntimeSignalAdapter` | **LOCKED** | `frontend/.../qualityCognitiveRuntimeSignalAdapter.js` |
| `qualitySpcSeriesAdapter` (+ Core) | **LOCKED** | `frontend/.../qualitySpcSeriesAdapter*.js` |
| `qualitySpcSeriesService` | **LOCKED** | `backend/.../qualitySpcSeriesService.js` |
| `dashboardKPIs.getQualityKpis` | **LOCKED** | `backend/src/services/dashboardKPIs.js` |
| `securityReconMiddleware` | **LOCKED** | `backend/src/securityRecon/` |
| `adminPortalSecurityDashboardService` | **LOCKED** | `backend/src/services/adminPortalSecurityDashboardService.js` |
| Domain cockpit resolvers (6) | **EXTENSÍVEL** | `frontend/src/cognitiveRuntime/domains/*/` |
| `cognitiveBlockRegistry` | **EXTENSÍVEL** | novos blocks via INC |
| Widget layout slots | **EXTENSÍVEL** | conteúdo, não geometria shell |
| New hub promotion engines | **GREENFIELD** | padrão INC-024 para outros domínios |

---

## Etapa 7 — Débitos arquiteturais consolidados

| ID | Criticidade | Descrição | Impacto | INC futura sugerida |
|----|-------------|-----------|---------|---------------------|
| **P-EXEC-001** | ALTA | `director` + quality/maintenance/env/lab → `director_industrial` | Colapso multi-domínio industrial | INC-EXEC-PROFILE |
| **P-EXEC-002** | ALTA | Layout diretor sempre industrial | UX executivo incorrecta | INC-EXEC-LAYOUT |
| **P-EXEC-003** | MÉDIA | CEO/diretor bypass filtro estrutural módulos | Exposição módulos extra | INC-RBAC-STRUCT |
| **P-EXEC-004** | MÉDIA | Sem ExecutiveNativeCockpitPromotion | CC executivo sem hubs nativos | INC-EXEC-PROMOTION |
| **P-ENV-001** | MÉDIA | Widget `operacoes` no layout ambiental | Contaminação cross-domain | INC-ENV-WIDGET |
| **P-ENV-002** | MÉDIA | EHS split coord→safety, gerente→environmental | Perfis ambíguos | INC-ENV-EHS |
| **P-ENV-003** | MÉDIA | `director` + environmental → industrial | Perfil incorrecto | (ver P-EXEC-001) |
| **P-ENV-004** | MÉDIA | Sem EnvironmentalNativeCockpitPromotion | Sem hubs CC ambiental | INC-ENV-PROMOTION |
| **P-PROD-001** | MÉDIA | Default gerente/coord → production | Perfil errado área desconhecida | INC-PROD-RESOLVER |
| **P-PROD-002** | ALTA | Fallback global → `operator_floor` | Superfície incorrecta | INC-PROD-FALLBACK |
| **P-PROD-003** | MÉDIA | Sem promotion hubs produção CC | Só adapter metadata | INC-PROD-PROMOTION |
| **P-MNT-001** | BAIXA | Heurística `tecnic` em maintenance pattern | Mitigada fail-closed | Monitor |
| **P-MNT-002** | BAIXA | `manuia.compatible_areas` amplas | Vazamento menu potencial | INC-MNT-MENU |
| **P-HR-001** | MÉDIA | Duplicidade `hr_management` vs `manager_hr` | Resolver ambíguo | INC-HR-PROFILE |
| **P-HR-004** | MÉDIA | Sem hub promotion RH CC | Runtime sem superfície CC | INC-HR-PROMOTION |
| **P-SST-001..004** | MÉDIA | SST domain layer + sem promotion CC | Parcial | INC-SST-PROMOTION |
| **P-SUP-001..003** | MÉDIA | Sem perfil/runtime supply | Colapso logística | INC-SUP-NATIVE |
| **P-LOG-001..003** | MÉDIA | Sem `logistics_native` | Gap arquitectural | INC-LOG-NATIVE |
| **P-QLT-001..006** | VAR | Quality greenfields + semântica open_nc | Ver [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | INC-035+ |
| **P-*-004** | MÉDIA | Promoção hubs só Quality | Outros domínios sem INC-024 | INC-MULTI-PROMOTION |

---

## Etapa 8 — Greenfields (fora do baseline)

| Módulo | Classificação | Domínio |
|--------|---------------|---------|
| PPAP | **NÃO IMPLEMENTADO** | Quality |
| MSA | **NÃO IMPLEMENTADO** | Quality |
| Ishikawa UI | **GREENFIELD** (engine existe) | Quality |
| 5 Porquês | **NÃO IMPLEMENTADO** | Quality |
| ISO Hub / Auditorias | **NÃO IMPLEMENTADO** | Quality / Compliance |
| Supplier Native | **GREENFIELD** | Quality / Supply |
| Logistics Native | **GREENFIELD** | Logistics |
| Supply Native | **GREENFIELD** | Supply |
| Finance Native | **GREENFIELD** | Finance |
| ExecutiveNativeCockpitPromotion | **GREENFIELD** | Executive |
| EnvironmentalNativeCockpitPromotion | **GREENFIELD** | Environment |
| ProductionNativeCockpitPromotion | **GREENFIELD** | Production |
| HRNativeCockpitPromotion | **GREENFIELD** | HR |
| SafetyNativeCockpitPromotion | **GREENFIELD** | Safety |
| Traceability Hub (Quality) | **GREENFIELD** | Quality |
| Laboratory profile dedicado | **FORA DO ESCOPO v1.0** | Quality |

---

## Etapa 9 — Política oficial de evolução

### Regra 1 — INC obrigatória

Alterações em **Resolvers**, **Promotion**, **Runtime**, **CentroComando shell**, **DashboardMecanico**, **dashboardSurfaceCapabilities**, **Registries**, **Adapters homologados** ou **Signal Loaders homologados** exigem:

1. **Nova INC** numerada com escopo explícito  
2. **Auditoria** read-only ou evidência prévia  
3. **Regressão completa** (quality 105/105 + domain contextual + cross-domain C3/C4)  
4. **Actualização de baseline** (domínio + SYSTEM se transversal)

### Regra 2 — Evolução permitida sem quebrar baseline

- Conteúdo cognitivo (textos, insights, severidade real)  
- Novos endpoints **aditivos** scoped por tenant  
- Novos módulos **GREENFIELD** em rotas/hubs novos  
- Dados reais adicionais em BD  
- Microanimações cosméticas (política INC-021)

### Regra 3 — Proibido

- Mock / placeholder em runtime homologado  
- Alterar geometria UI v1.0 sem INC  
- Bypass de `dashboardSurfaceCapabilities`  
- Force-push de runtime sem binding validation  
- Modificar adapters homologados «inline» no componente

---

## Índice rápido — Onde encontrar cada subsistema

| Preciso de… | Documento |
|-------------|-----------|
| Shell UI CentroComando | [BASELINE-UI-v1.0.md](BASELINE-UI-v1.0.md) |
| Perfis e superfícies | [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md) |
| Quality completo | [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) |
| Quality homologação | [INC-034-QUALITY-HOMOLOGATION.md](INC-034-QUALITY-HOMOLOGATION.md) |
| SPC séries reais | [INC-033-SPC-TIMESERIES-RECONCILIATION.md](INC-033-SPC-TIMESERIES-RECONCILIATION.md) |
| KPIs CC quality | [INC-032-COMMAND-CENTER-KPI-RECONCILIATION.md](INC-032-COMMAND-CENTER-KPI-RECONCILIATION.md) |
| Cognitive Hub quality | [INC-031-COGNITIVE-HUB-RUNTIME-INTEGRATION.md](INC-031-COGNITIVE-HUB-RUNTIME-INTEGRATION.md) |
| Runtime chain | [INC-030-RUNTIME-CHAIN-RECONCILIATION.md](INC-030-RUNTIME-CHAIN-RECONCILIATION.md) |
| Segregação quality | [INC-022-QUALITY-SURFACE-SEGREGATION.md](INC-022-QUALITY-SURFACE-SEGREGATION.md) |
| Promoção quality | [INC-024-QUALITY-NATIVE-PROMOTION.md](INC-024-QUALITY-NATIVE-PROMOTION.md) |
| Segurança infra | [security-baseline-01/SECURITY_BASELINE_01.md](security-baseline-01/SECURITY_BASELINE_01.md) |
| Security Recon | [../IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md](../IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md) |
| Centro Segurança SOC | [admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md](admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md) |
| Arquitectura global | **Este documento** |

---

## Referências INC transversais (UI)

| INC | Tema |
|-----|------|
| INC-010→013 | Forensic cognitive layer |
| INC-014→021 | Baseline UI lock |
| INC-022 | Quality surface segregation |
| INC-025 | Dashboards baseline |
| INC-028→034 | Quality runtime reconciliation chain |

---

## Versão e sucessão

| Versão | Data | Alteração |
|--------|------|-----------|
| SYSTEM v1.0 | 2026-07-16 | Congelamento arquitetural global inicial |
| QUALITY v1.0 → v1.1 | 2026-07-16 | Único baseline de domínio superseded nesta release |

**Próxima evolução SYSTEM:** `BASELINE-SYSTEM-v1.1` apenas após INC transversal com regressão multi-domínio completa.
