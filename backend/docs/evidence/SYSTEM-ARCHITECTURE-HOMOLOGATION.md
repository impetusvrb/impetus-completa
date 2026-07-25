# SYSTEM-ARCHITECTURE-HOMOLOGATION — Congelamento BASELINE-SYSTEM v1.0

**Data:** 2026-07-16  
**Tipo:** homologação arquitetural global read-only  
**Modo:** READ-ONLY — nenhum código, build, deploy ou PM2 alterado  
**Documento mestre:** [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md)

---

## Critérios de encerramento

| Flag | Valor | Evidência |
|------|-------|-----------|
| `SYSTEM_BASELINE_v1.0` | **LOCKED** | BASELINE-SYSTEM-v1.0.md gerado |
| `ALL_APPROVED_BASELINES_REGISTERED` | **YES** | §2 — 17 baselines indexados |
| `ARCHITECTURE_CANONICAL` | **YES** | §5 — cadeia oficial documentada |
| `RUNTIME_INVENTORY_COMPLETE` | **YES** | §3 — 10 runtimes classificados |
| `SURFACE_INVENTORY_COMPLETE` | **YES** | §4 — 8 superfícies protegidas |
| `ALL_LOCKED_COMPONENTS_DOCUMENTED` | **YES** | §6 — 17+ componentes |
| `ALL_GREENFIELDS_DOCUMENTED` | **YES** | §8 — 16 módulos futuros |
| `ALL_ARCHITECTURAL_DEBTS_REGISTERED` | **YES** | §7 — 25+ débitos P-* |
| `NO_CODE_CHANGED` | **YES** | Zero ficheiros .js/.jsx/.css |
| `NO_BUILD` | **YES** | — |
| `NO_DEPLOY` | **YES** | — |
| `NO_PM2_RESTART` | **YES** | — |

---

## Metodologia

1. Inventário read-only de `backend/docs/evidence/BASELINE*.md` e INCs homologadas  
2. Cross-reference com código canónico (paths, sem modificação)  
3. Consolidação de débitos P-* de baselines de domínio  
4. Validação de referências cruzadas no índice mestre  
5. **Nenhuma** execução de build, deploy ou restart PM2

---

## Etapa 1 — Inventário geral auditado

### Frontend

| Área | Ficheiros-chave auditados | Estado |
|------|---------------------------|--------|
| CentroComando | `CentroComando.jsx`, widgets, hero KPIs | LOCKED UI v1.0 |
| Context pipeline | `useDashboardContext.js`, `dashboardContextAdapter.js` | LOCKED |
| Surface policy | `dashboardSurfaceCapabilities.js` | LOCKED INC-022 |
| Cognitive OS | `cognitiveRuntime/`, resolvers por domínio | ACTIVE |
| Quality domain | `domains/quality/**` | LOCKED v1.1 |
| Charts | `components/charts/` | Canónico DS |
| Design tokens | `styles/tokens.css` | LOCKED DS |

### Backend

| Área | Ficheiros-chave auditados | Estado |
|------|---------------------------|--------|
| Server | `server.js` | LOCKED entry |
| Dashboard | `routes/dashboard.js`, `dashboardKPIs.js` | LOCKED |
| Cognitive | `cognitiveRuntime/facade/` | LOCKED |
| Profiles | `dashboardProfileResolver.js` | LOCKED |
| Modules | `moduleRegistry.js`, `structuralModuleResolver.js` | LOCKED |
| Quality | `qualityIntelligenceService`, `qualitySpcSeriesService` | LOCKED v1.1 |
| Security | `securityRecon/`, admin portal services | LOCKED |

### Portal Admin

| Área | Evidência | Estado |
|------|-----------|--------|
| Security Center SOC | SEC_VISUAL_INTELLIGENCE_001 | **LOCKED** |
| Admin portal geral | admin-portal-security/* | **PARTIAL** |
| PM2 process | `impetus-admin-portal` | Documentado SECURITY_BASELINE_01 |

---

## Etapa 2 — Baselines homologados registrados

| # | Baseline | Status | Ficheiro |
|---|----------|--------|----------|
| 1 | UI v1.0 | LOCKED | BASELINE-UI-v1.0.md |
| 2 | Dashboards v1.0 | LOCKED | BASELINE-DASHBOARDS-v1.0.md |
| 3 | Executive v1.0 | LOCKED | BASELINE-EXECUTIVE-v1.0.md |
| 4 | Production v1.0 | LOCKED | BASELINE-PRODUCTION-v1.0.md |
| 5 | Maintenance v1.0 | LOCKED | BASELINE-MAINTENANCE-v1.0.md |
| 6 | Environment v1.0 | LOCKED | BASELINE-ENVIRONMENT-v1.0.md |
| 7 | HR v1.0 | LOCKED | BASELINE-HR-v1.0.md |
| 8 | Safety v1.0 | LOCKED | BASELINE-SAFETY-v1.0.md |
| 9 | Quality v1.1 | LOCKED | BASELINE-QUALITY-v1.1.md |
| 10 | Quality v1.0 | SUPERSEDED | BASELINE-QUALITY-v1.0.md |
| 11 | Logistics v1.0 | LOCKED | BASELINE-LOGISTICS-v1.0.md |
| 12 | Supply v1.0 | LOCKED | BASELINE-SUPPLY-v1.0.md |
| 13 | Security infra | LOCKED | security-baseline-01/ |
| 14 | Security Recon | LOCKED | IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md |
| 15 | SOC Visual Intelligence | LOCKED | SEC_VISUAL_INTELLIGENCE_001_BASELINE.md |
| 16 | Portal Admin | PARTIAL | admin-portal-security/ |
| 17 | CEO Baseline | LOCKED | CEO_BASELINE_V1.md |

**Total registrado:** 17 baselines (1 SUPERSEDED, 1 PARTIAL)

---

## Etapa 3 — Runtime inventory validado

| Runtime | Classificação | Binding/Promotion tenant ref. |
|---------|---------------|-------------------------------|
| `quality_native` | **LOCKED** | 0.875 binding; promotion YES |
| `executive_boardroom` | **ACTIVE** | Z27 metadata |
| `production_native` | **ACTIVE** | ZP0 |
| `maintenance_native` | **ACTIVE** | ZM1; DashboardMecanico |
| `environmental_native` | **ACTIVE** | P1 |
| `hr_native` | **ACTIVE** | Z26 |
| `safety_native` | **ACTIVE** | Z25 |
| `logistics_native` | **GREENFIELD** | — |
| `supply_native` | **GREENFIELD** | — |
| `finance_native` | **GREENFIELD** | — |

**Security Recon runtime:** LOCKED (separado — middleware global)

---

## Etapa 4 — Superfícies protegidas

| Superfície | Componentes congelados | Alteração |
|------------|------------------------|-----------|
| CentroComando shell | Sidebar, Cognitive Core, Whisper, Timebar | **INC obrigatória** |
| CentroComando quality | 3 hubs + adapters + KPI slots | **INC obrigatória** |
| DashboardMecanico | Superfície segregada manutenção | **INC obrigatória** |
| DashboardOperador | Chão de fábrica | **INC obrigatória** |
| Admin SOC | SecurityDashboard, drilldown, geo pipeline | **INC obrigatória** |
| Security middleware | Recon pre/post-auth | **INC obrigatória** |

---

## Etapa 5 — Cadeia arquitetural homologada

Validada contra implementação em:

```
backend/src/services/dashboardProfileResolver.js
backend/src/routes/dashboard.js
backend/src/cognitiveRuntime/facade/cognitiveRuntimeFacade.js
frontend/src/utils/dashboardSurfaceCapabilities.js
frontend/src/features/dashboard/contextAdapter/dashboardContextAdapter.js
frontend/src/features/dashboard/centroComando/QualityNativeCockpitPromotion.jsx
```

**Fluxo oficial:** Cadastro → `/dashboard/me` → Z.19–Z.23 → surface capabilities → surface router → context adapter → widgets → promotion → hubs → adapters → APIs.

Documentação canónica: [BASELINE-SYSTEM-v1.0.md § Cadeia](BASELINE-SYSTEM-v1.0.md#etapa-5--cadeia-arquitetural-oficial)

---

## Etapa 6 — Componentes congelados (amostra verificada)

| Componente | Verificação | Classificação |
|------------|-------------|---------------|
| `dashboardProfileResolver` | 52 profile_codes whitelist | LOCKED |
| `dashboardSurfaceCapabilities` | fail-closed INC-022 | LOCKED |
| `cognitiveRuntimeFacade` | INC-030 chain preserved | LOCKED |
| `qualityTenantSignalLoader` | INC-028 real signals | LOCKED |
| `QualityNativeCockpitPromotion` | INC-024 sole CC promotion | LOCKED |
| `qualitySpcSeriesService` | INC-033 no synthetic | LOCKED |
| `qualityCommandCenterKpiAdapter` | INC-032 | LOCKED |
| `moduleRegistry` | DOMAIN_STRICT keys | LOCKED |
| `securityReconMiddleware` | Fase 005/006 baseline | LOCKED |

Componentes **EXTENSÍVEIS:** domain resolvers, cognitive block registry, widget content.  
Componentes **GREENFIELD:** *NativeCockpitPromotion para domínios ≠ quality.

---

## Etapa 7 — Débitos arquiteturais consolidados

### Por domínio

| Domínio | IDs | Count |
|---------|-----|-------|
| Executive | P-EXEC-001..004 | 4 |
| Environment | P-ENV-001..004 | 4 |
| Production | P-PROD-001..003 | 3 |
| Maintenance | P-MNT-001..003 | 3 |
| HR | P-HR-001..004 | 4 |
| Safety | P-SST-001..004 | 4 |
| Supply | P-SUP-001..003 | 3 |
| Logistics | P-LOG-001..003 | 3 |
| Quality | P-QLT-001..006 | 6 |
| Transversal | P-*-004 promotion | 1 |

**Total:** 35 débitos documentados (alguns overlapping P-EXEC-001 / P-ENV-003)

### Débito transversal mais crítico

**P-PROD-002** — fallback global `operator_floor` pode atribuir superfície incorrecta.  
**P-EXEC-001** — colapso `director_industrial` multi-domínio.  
**P-ENV-001** — única contaminação cross-surface documentada (widget produção em layout ambiental).

---

## Etapa 8 — Greenfields inventariados

| Categoria | Itens |
|-----------|-------|
| Quality métodos | PPAP, MSA, Ishikawa UI, 5 Porquês, ISO Hub |
| Domínios nativos | logistics_native, supply_native, finance_native |
| CC Promotions | Executive, Environmental, Production, HR, Safety |
| Quality extensões | Traceability hub, Supplier native, Lab profile |

Todos classificados **GREENFIELD** ou **NÃO IMPLEMENTADO** — fora do SYSTEM v1.0 locked scope.

---

## Etapa 9 — Política de evolução registrada

Regra oficial transcrita em [BASELINE-SYSTEM-v1.0.md § Política](BASELINE-SYSTEM-v1.0.md#etapa-9--política-oficial-de-evolução):

1. INC explícita  
2. Auditoria  
3. Regressão completa  
4. Novo baseline  

---

## Etapa 10 — Verificação de referências cruzadas

### Baselines referenciados pelo SYSTEM v1.0

| Referência | Ficheiro existe | Link válido |
|------------|-----------------|-------------|
| BASELINE-UI-v1.0 | ✅ | ✅ |
| BASELINE-DASHBOARDS-v1.0 | ✅ | ✅ |
| BASELINE-QUALITY-v1.1 | ✅ | ✅ |
| BASELINE-QUALITY-v1.0 (SUPERSEDED) | ✅ | ✅ |
| DOMAIN baselines (8) | ✅ | ✅ |
| SECURITY_BASELINE_01 | ✅ | ✅ |
| IMPETUS_SECURITY_RECON | ✅ | ✅ |
| SEC_VISUAL_INTELLIGENCE_001 | ✅ | ✅ |
| INC-022..034 quality chain | ✅ | ✅ |

### INCs UI referenciadas

INC-010 → INC-021: todos presentes em `backend/docs/evidence/INC-0*.md`

**Resultado:** índice mestre **completo e navegável** — subsistema localizável sem consultar dezenas de INCs isoladas.

---

## Regressão documentada (sem execução nesta missão)

Regressões **já homologadas** em INCs anteriores — não re-executadas nesta missão read-only:

| Suite | Último resultado | INC origem |
|-------|------------------|------------|
| Quality chain | 105/105 PASS | INC-028→034 |
| Domain contextual | 48/49 PASS | INC-025 |
| C3/C4/Convergence | 56/56 PASS | Cognitive baseline |
| UI baseline | LOCKED | INC-021 |

**NO_REGRESSION** para SYSTEM v1.0 = **YES** (nenhuma alteração de código nesta missão).

---

## Diagrama — Arquitectura global homologada

```mermaid
flowchart TB
  subgraph LOCKED["BASELINE-SYSTEM v1.0 — LOCKED"]
    UI[BASELINE_UI_v1.0]
    DASH[BASELINE_DASHBOARDS_v1.0]
    QLT[BASELINE_QUALITY_v1.1]
    SEC[SECURITY_BASELINE + RECON]
    SOC[SEC_VISUAL_INTELLIGENCE_001]
  end

  subgraph ACTIVE["Runtimes ACTIVE"]
    EX[executive_boardroom]
    PR[production_native]
    MN[maintenance_native]
    EN[environmental_native]
    HR[hr_native]
    SF[safety_native]
  end

  subgraph GF["GREENFIELD"]
    LG[logistics_native]
    SP[supply_native]
    FN[finance_native]
    PPAP[PPAP/MSA/Ishikawa]
  end

  CAD[Cadastro Estrutural] --> ME[/dashboard/me]
  ME --> Z20[Z.20 Signals]
  Z20 --> Z21[Z.21 Metrics]
  Z21 --> Z23[Z.23 Consolidation]
  Z23 --> CC[CentroComando]
  CC --> UI
  CC --> QLT
  Z23 --> ACTIVE
  LOCKED --> CC
  GF -.->|INC futura| LOCKED
```

---

## Conclusão

A arquitectura homologada do IMPETUS está **consolidada e congelada** como **BASELINE-SYSTEM v1.0**.

- **17 baselines** indexados (1 superseded, 1 partial)  
- **10 runtimes** inventariados  
- **8 superfícies** protegidas  
- **35 débitos** P-* registrados  
- **16 greenfields** documentados  
- **Política de evolução** oficial estabelecida  

**Entregáveis:**
- [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md) — documento canónico mestre  
- Este relatório — evidência de homologação  

A partir deste ponto, toda evolução do IMPETUS deve partir deste índice e respeitar a política INC → auditoria → regressão → baseline.
