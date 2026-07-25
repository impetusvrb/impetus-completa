# BASELINE DASHBOARDS v1.0 — Homologação Arquitectural IMPETUS

**INC:** INC-025  
**Data congelamento:** 2026-07-15  
**Tipo:** homologação arquitectural (read-only — sem implementação)  
**Pré-requisitos:** INC-014 → INC-024, BASELINE UI v1.0

---

## Objetivo

Consolidar e **congelar** o baseline funcional de todos os dashboards organizacionais após estabilização do Centro de Comando. A partir deste ponto, evoluções (PPAP, MSA, Ishikawa, novos motores cognitivos) são **incrementais sobre arquitectura homologada**.

---

## Estado global

```
BASELINE_DASHBOARDS_v1.0     = LOCKED
ZERO_CROSS_SURFACE_CONTAMINATION = PARTIAL
ALL_RUNTIME_RESOLVED         = PARTIAL
ALL_SURFACES_LOCKED          = YES
```

**Interpretação:** Baselines documentados e congelados **com pendências explícitas**. Segregação de superfície (INC-022) homologada; gaps de resolver, widgets cross-domain e promoção frontend documentados como débito arquitectural v1.0.

---

## Inventário — Área × Runtime × Surface × Baseline

| Área | Runtime nativo | Surface | Baseline doc | Lock |
|------|----------------|---------|--------------|------|
| **Executivo** | `executive_boardroom` (Z27) | CentroComando | [BASELINE-EXECUTIVE-v1.0.md](BASELINE-EXECUTIVE-v1.0.md) | YES |
| **Produção** | `production_native` (ZP0) | CentroComando / DashboardOperador | [BASELINE-PRODUCTION-v1.0.md](BASELINE-PRODUCTION-v1.0.md) | YES |
| **Manutenção** | `maintenance_native` (ZM1) | **DashboardMecanico** | [BASELINE-MAINTENANCE-v1.0.md](BASELINE-MAINTENANCE-v1.0.md) | YES |
| **Qualidade** | `quality_native` (Z22+Z23) | CentroComando | [BASELINE-QUALITY-v1.0.md](BASELINE-QUALITY-v1.0.md) | YES |
| **Meio Ambiente** | `environmental_native` (P1) | CentroComando | [BASELINE-ENVIRONMENT-v1.0.md](BASELINE-ENVIRONMENT-v1.0.md) | YES |
| **RH** | `hr_native` (Z26) | CentroComando | [BASELINE-HR-v1.0.md](BASELINE-HR-v1.0.md) | YES |
| **Segurança (SST)** | `safety_native` (Z25) | CentroComando | [BASELINE-SAFETY-v1.0.md](BASELINE-SAFETY-v1.0.md) | YES |
| **Logística** | *none* | CentroComando | [BASELINE-LOGISTICS-v1.0.md](BASELINE-LOGISTICS-v1.0.md) | YES |
| **Suprimentos** | *none* (colapsado logística) | CentroComando | [BASELINE-SUPPLY-v1.0.md](BASELINE-SUPPLY-v1.0.md) | YES |
| **Industrial** | overlap prod/exec | CentroComando | § Industrial abaixo | YES |
| **Laboratório** | overlap quality | CentroComando | § Lab abaixo | YES |

---

## Cadeia canónica auditada

```
Perfil (ROLE + functional_area + structural_profile)
  ↓
dashboardProfileResolver.getProfile()  [52 profile_codes whitelist]
  ↓
structuralModuleResolver + moduleRegistry  [visible_modules filtrados]
  ↓
/dashboard/me → cognitiveRuntimeFacade  [Z19–Z29 por domínio]
  ↓
dashboardSurfaceCapabilities  [INC-009/022 fail-closed]
  ↓
Dashboard.jsx → Surface (CentroComando | DashboardMecanico | DashboardOperador)
  ↓
dashboardContextAdapter.buildDashboardContext()  [prioridade multi-runtime]
  ↓
LayoutPorCargo / widgets / QualityNativeCockpitPromotion (INC-024)
```

---

## Perfis homologados (52)

### Legado `dashboardProfiles.js` (24)

`ceo_executive`, `director_operations`, `director_unassigned`, `director_industrial`, `manager_production`, `manager_maintenance`, `manager_quality`, `coordinator_production`, `coordinator_maintenance`, `coordinator_environmental`, `manager_environmental`, `supervisor_environmental`, `coordinator_quality`, `supervisor_production`, `supervisor_maintenance`, `supervisor_quality`, `analyst_pcp`, `technician_maintenance`, `inspector_quality`, `operator_floor`, `hr_management`, `finance_management`, `admin_system`

### Domain layer `domainDashboardProfiles.js` (28)

RH, financeiro, logística, engenharia, SST, compliance, legal, operations — variantes coordinator/manager/supervisor/director

---

## Runtime por área (produção)

| Runtime | Flag env | Pilot profiles | Backend consolidator | Frontend CC promotion |
|---------|----------|----------------|----------------------|----------------------|
| `quality_native` | `IMPETUS_QUALITY_NATIVE_COCKPIT=on` | manager/coord/supervisor_quality | Z23 | **YES** (INC-024) |
| `environmental_native` | `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT=on` | coord/manager/supervisor_environmental | P1 | NO (adapter only) |
| `maintenance_native` | `IMPETUS_MAINTENANCE_NATIVE_COCKPIT=on` | coord/manager/supervisor/technician_maintenance | ZM1 | N/A (DashboardMecanico) |
| `production_native` | `IMPETUS_PRODUCTION_NATIVE_COCKPIT=on` | coord/manager/supervisor_production, analyst_pcp, director_industrial | ZP0 | NO |
| `hr_native` | `IMPETUS_HR_NATIVE_COCKPIT=on` | coord/manager/supervisor_hr, hr_management | Z26 | NO |
| `safety_native` | `IMPETUS_SST_NATIVE_COCKPIT=on` | coord/manager/supervisor_safety | Z25 | NO |
| `executive_boardroom` | `IMPETUS_EXECUTIVE_BOARDROOM=on` | ceo, director_*, cfo | Z27 | NO |
| *logistics* | — | — | — | — |

**Render promotion global:** `IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled`

---

## Superfícies homologadas

| Superfície | Perfis | Regra |
|------------|--------|-------|
| **CentroComando** | Default; qualidade; ambiental; executivo; RH; SST; logística; produção (liderança) | `commandCenter: !maintenance` |
| **DashboardMecanico** | Manutenção liderança/técnico | Fail-closed bloqueia quality, environmental, executive |
| **DashboardOperador** | `operator_floor`, role operador | Superfície chão-de-fábrica |
| **Redirect admin** | admin / internal_admin | `/app/chatbot` |

**Referência segregação:** `INC-022-QUALITY-SURFACE-SEGREGATION.md`

---

## Módulos activos vs bloqueados

### Domínios strict (`DOMAIN_STRICT_MENU_KEYS`)

| menu_key | Eixo requerido |
|----------|----------------|
| `quality_intelligence` | eixo_qualidade / laboratorial |
| `safety_intelligence` | eixo_seguranca |
| `hr_intelligence` | eixo_rh |
| `manuia` | eixo_manutencao |
| `environment_intelligence` | eixo_ambiental |
| `logistics_intelligence` | eixo_logistica / estoque |
| `raw_material_lots` | qualidade / estoque |

### Universais (todos os perfis)

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `chat`, `settings` (+ bypass admin/audit)

### Overrides por perfil

- **RH:** bloqueia SST, ambiental, manuia; força `hr_intelligence`
- **SST:** força `safety_intelligence`
- **CEO/diretor:** bypass filtro estrutural (pendência P-EXEC-003)

---

## Placeholders conhecidos (v1.0)

| Área | Placeholders | Supressão runtime |
|------|--------------|-------------------|
| Qualidade | 7 widgets genéricos | YES (Z23 + INC-024) |
| Produção | operacoes, gargalos, kpi_cards | NO |
| Ambiental | kpi_cards, **operacoes** | NO |
| Logística | logistica, estoque widgets | NO |
| Executivo | resumo, KPI genéricos | Parcial (Z27) |
| Manutenção | manutencao widget | Parcial (ZM1) |

---

## Segregação cross-domain — matriz de conformidade

| Área | maintenance | quality | environment | production | hr | Status |
|------|-------------|---------|-------------|------------|-----|--------|
| **RH** | blocked | blocked | blocked | blocked | — | OK |
| **Qualidade** | blocked surface | — | blocked | suprimido Z23 | blocked | OK |
| **Manutenção** | — | blocked surface | blocked surface | menu parcial | blocked | OK |
| **Ambiental** | blocked surface | blocked | — | **widget operacoes** | blocked | **PARTIAL** |
| **SST** | blocked | blocked | split EHS | blocked | blocked | OK |
| **Produção** | blocked | blocked | blocked | — | blocked | OK |

---

## Industrial (eixo transversal)

| PROFILE_CODE | Runtime | Notas |
|--------------|---------|-------|
| `director_industrial` | executive + production | Colapso multi-domínio (quality, maintenance, env, lab → mesmo perfil) |
| `manager_engineering` | production (parcial) | Engenharia de processo |
| `coordinator_engineering` | production (parcial) | |

**Pendência principal:** P-EXEC-001 — resolver `director_industrial` não distingue domínio real.

---

## Laboratório

| Campo | Valor |
|-------|-------|
| **PROFILE_CODE** | *none* — `laboratory` → quality profiles |
| **RUNTIME** | `quality_native` (herança) |
| **SURFACE** | CentroComando |
| **Módulos** | `quality_intelligence` (`compatible_axes: eixo_laboratorial`) |

**Pendência:** P-QLT-003 — sem perfil lab autónomo.

---

## Outros perfis activos

| PROFILE_CODE | Surface | Runtime | Notas |
|--------------|---------|---------|-------|
| `finance_management` | CentroComando | none | `isFinanceDashboardLayout` |
| `manager_financial` / `coordinator_financial` | CentroComando | none | domain layer |
| `manager_compliance` / `legal` | CentroComando | none | domain layer |
| `admin_system` | redirect | N/A | chatbot |
| `analyst_pcp` | CentroComando | production_native | PCP |
| `inspector_quality` | CentroComando | quality (parcial) | Inspetor |

---

## GAPs consolidados (pendências v1.0)

| ID | Severidade | Área | Descrição |
|----|------------|------|-----------|
| P-EXEC-001 | ALTA | Executivo/Industrial | Colapso `director_industrial` multi-domínio |
| P-EXEC-002 | ALTA | Executivo | Layout diretor sempre industrial |
| P-ENV-001 | MÉDIA | Ambiental | Widget `operacoes` no layout ambiental |
| P-PROD-001 | MÉDIA | Produção | Default role → produção |
| P-PROD-002 | ALTA | Global | Fallback `operator_floor` |
| P-SUP-001 | MÉDIA | Suprimentos | Sem perfil supply dedicado |
| P-LOG-001 | MÉDIA | Logística | Sem runtime nativo |
| P-*-004 | MÉDIA | Multi | Promoção frontend hubs só em Qualidade (INC-024) |

**Nenhum GAP bloqueia o lock documental v1.0** — são débitos para INCs futuras de evolução incremental.

---

## Dependências congeladas

| Camada | Artefacto | Versão |
|--------|-----------|--------|
| UI Shell | BASELINE-UI-v1.0 | LOCKED (INC-014→021) |
| Superfície | dashboardSurfaceCapabilities | INC-022 |
| Qualidade CC | QualityNativeCockpitPromotion | INC-024 |
| Context adapter | dashboardContextAdapter.js | Multi-runtime Z23–Z27 |
| Perfis | dashboardProfiles + domainDashboardProfiles | 52 codes |
| Módulos | moduleRegistry + structuralModuleResolver | DOMAIN_STRICT |

---

## Itens futuros (fora baseline v1.0)

- PPAP, MSA, Ishikawa, 5 Porquês (novos desenvolvimentos funcionais)
- Promoção hubs nativos: environmental, production, hr, safety (padrão INC-024)
- Perfis dedicados: supply, laboratory, logistics director
- Desagregação `director_industrial`
- Remoção widget `operacoes` do layout ambiental
- Runtime `logistics_native`

---

## Gates por área (resumo)

| Área | PROFILE | SURFACE | RUNTIME | MODULES | LOCKED |
|------|---------|---------|---------|---------|--------|
| Executivo | YES | YES | PARTIAL | PARTIAL | YES |
| Produção | YES | YES | PARTIAL | YES | YES |
| Manutenção | YES | YES | PARTIAL | YES | YES |
| Qualidade | YES | YES | **YES** | YES | YES |
| Ambiental | YES | YES | PARTIAL | PARTIAL | YES |
| RH | YES | YES | PARTIAL | YES | YES |
| SST | YES | YES | PARTIAL | YES | YES |
| Logística | YES | YES | NO | YES | YES |
| Suprimentos | PARTIAL | YES | NO | PARTIAL | YES |

---

## Critérios de aprovação INC-025

| Critério | Resultado | Notas |
|----------|-----------|-------|
| `ZERO_CROSS_SURFACE_CONTAMINATION` | **PARTIAL** | INC-022 OK; P-ENV-001 widget |
| `ALL_RUNTIME_RESOLVED` | **PARTIAL** | Backend 7/9; frontend promotion 1/7 |
| `ALL_SURFACES_LOCKED` | **YES** | Router + fail-closed homologados |
| `BASELINE_DASHBOARDS_v1.0` | **LOCKED** | 10 documentos evidência |

---

## Documentos de evidência

| Documento | Eixo |
|-----------|------|
| [BASELINE-EXECUTIVE-v1.0.md](BASELINE-EXECUTIVE-v1.0.md) | Executivo |
| [BASELINE-PRODUCTION-v1.0.md](BASELINE-PRODUCTION-v1.0.md) | Produção |
| [BASELINE-MAINTENANCE-v1.0.md](BASELINE-MAINTENANCE-v1.0.md) | Manutenção |
| [BASELINE-QUALITY-v1.0.md](BASELINE-QUALITY-v1.0.md) | Qualidade + Lab |
| [BASELINE-ENVIRONMENT-v1.0.md](BASELINE-ENVIRONMENT-v1.0.md) | Meio Ambiente |
| [BASELINE-HR-v1.0.md](BASELINE-HR-v1.0.md) | RH |
| [BASELINE-SAFETY-v1.0.md](BASELINE-SAFETY-v1.0.md) | Segurança |
| [BASELINE-LOGISTICS-v1.0.md](BASELINE-LOGISTICS-v1.0.md) | Logística |
| [BASELINE-SUPPLY-v1.0.md](BASELINE-SUPPLY-v1.0.md) | Suprimentos |
| **BASELINE-DASHBOARDS-v1.0.md** | **Mestre (este documento)** |

---

## Declaração de congelamento

A partir de **2026-07-15**, o baseline funcional v1.0 dos dashboards organizacionais IMPETUS está **homologado e documentado**. Alterações a:

- resolvers de perfil/superfície,
- segregação cross-domain,
- promoção de runtime nativo,
- matriz perfil → widgets → módulos

requerem **nova INC explícita**. Evolução de conteúdo, dados e funcionalidades de domínio (PPAP, MSA, etc.) pode prosseguir incrementalmente sobre esta base.

```
BASELINE_DASHBOARDS_v1.0 = LOCKED
HOMOLOGATION_DATE = 2026-07-15
INC = INC-025
```
