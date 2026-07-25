# BASELINE-SYSTEM v1.1 — Arquitetura Homologada Global do IMPETUS

**Identificador:** `BASELINE-SYSTEM-v1.1`  
**Data de congelamento:** 2026-07-16  
**Modo:** consolidação arquitetural read-only (INC-044 — sem alterações de código)  
**Estado:** `SYSTEM_BASELINE_v1.1 = LOCKED`  
**Sucessor de:** [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md)  
**Evidência:** [INC-044-SYSTEM-CONSOLIDATION.md](INC-044-SYSTEM-CONSOLIDATION.md)

---

## Declaração canónica

Este documento é o **índice mestre e referência arquitetural única** do IMPETUS após homologação dos domínios cognitivos **Qualidade** (INC-022 → INC-034) e **Logística** (INC-036 → INC-043).

> **Nenhuma evolução futura poderá alterar componentes homologados sem nova INC explícita, auditoria, regressão completa e actualização de baseline.**

A partir de **BASELINE-SYSTEM v1.1**, novas funcionalidades de negócio deixam de ser evolução arquitectural e passam a ser **greenfields incrementais** ou **evoluções funcionais** sobre runtimes LOCKED — preservando a estabilidade do núcleo cognitivo.

**Relatórios de homologação:**
- [SYSTEM-ARCHITECTURE-HOMOLOGATION.md](SYSTEM-ARCHITECTURE-HOMOLOGATION.md) — congelamento v1.0 (histórico)
- [INC-034-QUALITY-HOMOLOGATION.md](INC-034-QUALITY-HOMOLOGATION.md) — Quality v1.1
- [INC-043-LOGISTICS-HOMOLOGATION.md](INC-043-LOGISTICS-HOMOLOGATION.md) — Logistics v1.1
- [INC-044-SYSTEM-CONSOLIDATION.md](INC-044-SYSTEM-CONSOLIDATION.md) — consolidação sistémica v1.1

---

## Critérios de encerramento (SYSTEM v1.1)

| Flag | Valor |
|------|-------|
| `SYSTEM_BASELINE_v1.1` | **LOCKED** |
| `QUALITY_BASELINE` | **LOCKED** (v1.1) |
| `LOGISTICS_BASELINE` | **LOCKED** (v1.1) |
| `ALL_APPROVED_BASELINES_REGISTERED` | **YES** |
| `ALL_RUNTIME_REFERENCES` | **CONSISTENT** |
| `ALL_BASELINES_INDEXED` | **YES** |
| `ARCHITECTURE_CANONICAL` | **YES** |
| `RUNTIME_INVENTORY_COMPLETE` | **YES** |
| `ZERO_ARCHITECTURE_CHANGED` | **YES** |
| `ZERO_CODE_CHANGED` | **YES** (INC-044) |
| `ZERO_PM2_RESTART` | **YES** (INC-044) |

---

## Índice mestre — Baselines homologados

| Baseline | Estado | Documento | Notas |
|----------|--------|-----------|-------|
| **BASELINE_UI_v1.0** | **LOCKED** | [BASELINE-UI-v1.0.md](BASELINE-UI-v1.0.md) | Shell CentroComando desktop (INC-014→021) |
| **BASELINE_DASHBOARDS_v1.0** | **LOCKED** | [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md) | 52 perfis; matriz área×runtime×surface |
| **BASELINE_QUALITY_v1.1** | **LOCKED** | [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | `quality_native` Z22+Z23; INC-022→034 |
| **BASELINE_LOGISTICS_v1.1** | **LOCKED** | [BASELINE-LOGISTICS-v1.1.md](BASELINE-LOGISTICS-v1.1.md) | `logistics_native` Z19→Z23; INC-036→043 |
| **BASELINE_EXECUTIVE_v1.0** | **LOCKED** | [BASELINE-EXECUTIVE-v1.0.md](BASELINE-EXECUTIVE-v1.0.md) | `executive_boardroom` Z27 |
| **BASELINE_PRODUCTION_v1.0** | **LOCKED** | [BASELINE-PRODUCTION-v1.0.md](BASELINE-PRODUCTION-v1.0.md) | `production_native` ZP0 |
| **BASELINE_MAINTENANCE_v1.0** | **LOCKED** | [BASELINE-MAINTENANCE-v1.0.md](BASELINE-MAINTENANCE-v1.0.md) | `maintenance_native` ZM1; DashboardMecanico |
| **BASELINE_ENVIRONMENT_v1.0** | **LOCKED** | [BASELINE-ENVIRONMENT-v1.0.md](BASELINE-ENVIRONMENT-v1.0.md) | `environmental_native` P1 |
| **BASELINE_HR_v1.0** | **LOCKED** | [BASELINE-HR-v1.0.md](BASELINE-HR-v1.0.md) | `hr_native` Z26 |
| **BASELINE_SAFETY_v1.0** | **LOCKED** | [BASELINE-SAFETY-v1.0.md](BASELINE-SAFETY-v1.0.md) | `safety_native` Z25 (SST) |
| **BASELINE_QUALITY_v1.0** | **SUPERSEDED** | [BASELINE-QUALITY-v1.0.md](BASELINE-QUALITY-v1.0.md) | Substituído por v1.1 |
| **BASELINE_LOGISTICS_v1.0** | **SUPERSEDED** | [BASELINE-LOGISTICS-v1.0.md](BASELINE-LOGISTICS-v1.0.md) | Substituído por v1.1 (runtime nativo homologado) |
| **BASELINE_SUPPLY_v1.0** | **LOCKED** | [BASELINE-SUPPLY-v1.0.md](BASELINE-SUPPLY-v1.0.md) | Colapsado em logística; runtime **GREENFIELD** |
| **SECURITY_BASELINE_01** | **LOCKED** | [security-baseline-01/SECURITY_BASELINE_01.md](security-baseline-01/SECURITY_BASELINE_01.md) | Superfície segurança infra |
| **IMPETUS_SECURITY_RECON** | **LOCKED** | [../IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md](../IMPETUS_SECURITY_RECON_PRODUCTION_BASELINE.md) | Anti-recon runtime |
| **SEC_VISUAL_INTELLIGENCE_001** | **LOCKED** | [admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md](admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md) | Centro de Segurança (admin-portal) |
| **BASELINE_PORTAL_ADMIN** | **PARTIAL** | [admin-portal-security/](admin-portal-security/) | SOC certificado; portal geral parcial |
| **CEO_BASELINE_V1** | **LOCKED** | [CEO_BASELINE_V1.md](CEO_BASELINE_V1.md) | Baseline executivo CEO |
| **BASELINE-SYSTEM_v1.0** | **SUPERSEDED** | [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md) | Substituído por este documento |

### Estado global consolidado (v1.1)

| Dimensão | Estado |
|----------|--------|
| UI Shell CC | **LOCKED** (v1.0) |
| Dashboards organizacionais | **LOCKED** (v1.0; débitos P-* documentados) |
| Quality domain | **LOCKED v1.1** — runtime + promotion + CC |
| Logistics domain | **LOCKED v1.1** — runtime + loader + promotion + CC |
| Cross-surface contamination | **PARTIAL** (P-ENV-001; Quality/Logistics segregados INC-022) |
| Runtime resolution | **PARTIAL** (finance/supply greenfield; 8 nativos LOCKED) |
| Security infra + recon | **LOCKED** |

---

## Etapa 1 — Inventário de runtimes cognitivos

Classificação oficial pós INC-043 / INC-044:

| Runtime (família) | Runtime ID canónico | Camada | Estado | CC Promotion | Baseline |
|-------------------|---------------------|--------|--------|--------------|----------|
| **executive_native** | `executive_boardroom` | Z27 | **LOCKED** | NO | EXECUTIVE v1.0 |
| **production_native** | `production_native` | ZP0 | **LOCKED** | NO | PRODUCTION v1.0 |
| **maintenance_native** | `maintenance_native` | ZM1 | **LOCKED** | N/A (DashboardMecanico) | MAINTENANCE v1.0 |
| **quality_native** | `quality_native` | Z22+Z23 | **LOCKED** | **YES** | QUALITY v1.1 |
| **logistics_native** | `logistics_native` | Z19→Z23 | **LOCKED** | **YES** | LOGISTICS v1.1 |
| **environmental_native** | `environmental_native` | P1 | **LOCKED** | NO | ENVIRONMENT v1.0 |
| **hr_native** | `hr_native` | Z26 | **LOCKED** | NO | HR v1.0 |
| **safety_native** | `safety_native` | Z25 | **LOCKED** | NO | SAFETY v1.0 |
| **finance_native** | — | — | **GREENFIELD** | NO | — |
| **supply_native** | — | — | **GREENFIELD** | NO | SUPPLY v1.0 (doc) |

> **Nota de nomenclatura:** a família **executive_native** corresponde ao runtime ID **`executive_boardroom`** em código e baselines de domínio — não existe ID `executive_native` separado.

**Render promotion global:** `IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled`

### Fases runtime transversais (backend)

| Fase | Responsabilidade | Estado |
|------|------------------|--------|
| Z.19 | Feature flags / pilot runtime | LOCKED |
| Z.20 | Engine bridge + signal loaders | LOCKED (Quality INC-028; Logistics INC-039/040) |
| Z.21 | Operational metrics + insights | LOCKED (Quality); N/A path logistics dedicado |
| Z.22 | Render promotion | LOCKED (Quality INC-024; Logistics INC-041) |
| Z.23 | Cockpit consolidation | LOCKED (Quality INC-030; Logistics INC-041) |
| C3–C6 | Authority, truth, convergence, governance | ACTIVE |
| Security Recon | Pre/post-auth guard | LOCKED |

---

## Etapa 2 — Matriz única de domínios cognitivos

| Domínio | Runtime ID | Loader (Z.20) | Promotion (Z.22) | Hubs CC | Baseline | Estado |
|---------|------------|---------------|------------------|---------|----------|--------|
| **Executivo** | `executive_boardroom` | N/A (Z27) | NO | NO | EXECUTIVE v1.0 | **LOCKED** |
| **Produção** | `production_native` | production* loaders | NO | NO | PRODUCTION v1.0 | **LOCKED** |
| **Manutenção** | `maintenance_native` | maintenance* loaders | NO | DashboardMecanico | MAINTENANCE v1.0 | **LOCKED** |
| **Qualidade** | `quality_native` | `qualityTenantSignalLoader` | `QualityNativeCockpitPromotion` | 3 hubs (+ centers Z.23) | QUALITY v1.1 | **LOCKED** |
| **Logística** | `logistics_native` | `logisticsTenantSignalLoader` | `LogisticsNativeCockpitPromotion` | 7 hubs | LOGISTICS v1.1 | **LOCKED** |
| **Meio Ambiente** | `environmental_native` | environmental* | NO | NO | ENVIRONMENT v1.0 | **LOCKED** |
| **RH** | `hr_native` | hr* | NO | NO | HR v1.0 | **LOCKED** |
| **Segurança (SST)** | `safety_native` | safety* | NO | NO | SAFETY v1.0 | **LOCKED** |
| **Financeiro** | — | — | — | — | — | **GREENFIELD** |
| **Suprimentos** | — | — | — | — | SUPPLY v1.0 (doc) | **GREENFIELD** |

**Paridade arquitectural Quality ↔ Logistics (homologada):**

| Capacidade | Quality | Logistics |
|------------|---------|-----------|
| Runtime foundation | ✅ | ✅ INC-038 |
| Signal loader real | ✅ INC-028 | ✅ INC-039 |
| Binding reconciliation | ✅ | ✅ INC-040 |
| Promotion chain Z.22→Z.23 | ✅ | ✅ INC-041 |
| CC native promotion | ✅ INC-024 | ✅ INC-042 |
| Baseline homologação | v1.1 INC-034 | v1.1 INC-043 |
| Payload canónico CC | `specialized_cockpit_runtime` | `logistics_cognitive_runtime` |

---

## Etapa 3 — Cadeia arquitetural oficial (v1.1)

```
Cadastro Estrutural
  (users + structural_profile + functional_area + department)
        ↓
GET /api/dashboard/me
  (routes/dashboard.js → cognitiveRuntimeFacade)
        ↓
dashboardSurfaceCapabilities
  (fail-closed INC-009/022 — seleção de superfície)
        ↓
Runtime resolution
  (cockpit_mode por domínio: quality_native | logistics_native | …)
        ↓
Z.19 Feature Flags / Pilot
        ↓
Z.20 Signal Loaders + Engine Bridge
  (qualityTenantSignalLoader, logisticsTenantSignalLoader, production*, …)
        ↓
Z.21 Domain Adapters
  (qualityOperationalMetrics, insights — path logistics N/A dedicado)
        ↓
Z.22 Render Promotion
  (cognitive_render_promotion — controlled; supervisores passivos)
        ↓
Z.23 Consolidation
  (specialized_cockpit_runtime | logistics_cognitive_runtime + centers)
        ↓
Promotion (Native Cockpit Promotion)
  (QualityNativeCockpitPromotion | LogisticsNativeCockpitPromotion)
        ↓
CentroComando Shell
  (CentroComando.jsx — mount + supressão widgets placeholder)
        ↓
Hubs
  (GovernanceHub, TelemetryHub, WarehouseGovernanceHub, …)
        ↓
Adapters (frontend)
  (KPI, SPC, Cognitive, logisticsRuntimeHubAdapter)
        ↓
APIs oficiais + datasets BD
```

**Esta cadeia é arquitetura oficial v1.1.** Qualquer atalho (mock, bypass, payload sintético) fora de adapters homologados é proibido.

---

## Etapa 4 — Superfícies protegidas

| Superfície | Perfis | Modificável sem INC? | Baseline |
|------------|--------|----------------------|----------|
| **CentroComando** | Default multi-domínio | **NÃO** (shell UI v1.0) | UI + DASHBOARDS |
| **DashboardMecanico** | Manutenção | **NÃO** (superfície segregada) | MAINTENANCE |
| **DashboardOperador** | `operator_floor` | **NÃO** (layout chão) | PRODUCTION |
| **Quality Native hubs** | quality profiles | **NÃO** (adapters INC-031/032/033) | QUALITY v1.1 |
| **Logistics Native hubs** | logistics profiles | **NÃO** (INC-042; runtime-only) | LOGISTICS v1.1 |
| **Portal Admin — SOC** | admin JWT | **NÃO** (SEC-SVI-001) | SEC_VISUAL |
| **Security Recon middleware** | global | **NÃO** | SEC_RECON |
| **Cognitive Core strip** | todos CC | **NÃO** (INC-014→021) | UI v1.0 |
| **Whisper omnipresence** | todos CC | **NÃO** (INC-017→020) | UI v1.0 |

---

## Etapa 5 — Componentes congelados (núcleo transversal)

| Componente | Classificação | Path |
|------------|---------------|------|
| `dashboardProfileResolver` | **LOCKED** | `backend/src/services/dashboardProfileResolver.js` |
| `dashboardSurfaceCapabilities` | **LOCKED** | `frontend/src/utils/dashboardSurfaceCapabilities.js` |
| `structuralModuleResolver` | **LOCKED** | `backend/src/services/structuralModuleResolver.js` |
| `moduleRegistry` | **LOCKED** | `backend/src/contextualModules/moduleRegistry.js` |
| `cognitiveRuntimeFacade` | **LOCKED** | `backend/src/cognitiveRuntime/facade/cognitiveRuntimeFacade.js` |
| `dashboardContextAdapter` | **LOCKED** | `frontend/src/features/dashboard/contextAdapter/` |
| **Quality — promotion** | **LOCKED** | `QualityNativeCockpitPromotion.jsx` |
| **Quality — loader** | **LOCKED** | `qualityTenantSignalLoader.js` |
| **Quality — adapters** | **LOCKED** | KPI, Cognitive, SPC adapters + `qualitySpcSeriesService.js` |
| **Logistics — promotion** | **LOCKED** | `LogisticsNativeCockpitPromotion.jsx` |
| **Logistics — loader** | **LOCKED** | `logisticsTenantSignalLoader.js` + bridge/binding |
| **Logistics — consolidation** | **LOCKED** | `logisticsCockpitConsolidationRuntime.js` + centers |
| **Logistics — CC mount** | **LOCKED** | `CentroComando.jsx` (supressão logistica/estoque) |
| `securityReconMiddleware` | **LOCKED** | `backend/src/securityRecon/` |
| Domain cockpit resolvers | **EXTENSÍVEL** | `frontend/src/cognitiveRuntime/domains/*/` |
| `cognitiveBlockRegistry` | **EXTENSÍVEL** | novos blocks via INC |
| New hub promotion engines (outros domínios) | **GREENFIELD** | padrão INC-024/INC-042 |

---

## Etapa 6 — Débitos arquiteturais consolidados

### Greenfields (runtime / módulo inexistente)

| Item | Domínio | Classificação |
|------|---------|---------------|
| **PPAP** | Quality | NÃO IMPLEMENTADO |
| **MSA** | Quality | NÃO IMPLEMENTADO |
| **Ishikawa UI** | Quality | ENGINE EXISTE / UI GREENFIELD |
| **5 Porquês** | Quality | NÃO IMPLEMENTADO |
| **Finance Native** | Finance | **GREENFIELD** |
| **Supply Native** | Supply | **GREENFIELD** |
| ExecutiveNativeCockpitPromotion | Executive | GREENFIELD |
| EnvironmentalNativeCockpitPromotion | Environment | GREENFIELD |
| ProductionNativeCockpitPromotion | Production | GREENFIELD |
| HRNativeCockpitPromotion | HR | GREENFIELD |
| SafetyNativeCockpitPromotion | Safety | GREENFIELD |

### Evoluções incrementais (runtime LOCKED — funcionalidade nova)

| Item | Domínio | Notas |
|------|---------|-------|
| **Picking** | Logistics | `picking_efficiency` → NOT_IMPLEMENTED (INC-043) |
| **Fleet AI** | Logistics | hub apresentação; enriquecimento futuro |
| **OTIF avançado** | Logistics | DistributionHub — dados WMS/TMS |
| **Warehouse Telemetry** | Logistics | massa de dados docas |
| **Supplier Intelligence** | Logistics / Quality | cross-domain; aguardar dados |
| Traceability Hub | Quality | center Z.23 dedicado |
| ISO Hub / Auditorias | Quality / Compliance | NÃO IMPLEMENTADO |

### Débitos transversais (perfis / superfícies — herdados v1.0)

| ID | Criticidade | Descrição | INC futura sugerida |
|----|-------------|-----------|---------------------|
| **P-EXEC-001..004** | ALTA/MÉDIA | Perfis/layout/promotion executivo | INC-EXEC-* |
| **P-ENV-001..004** | MÉDIA | Contaminação widget; sem promotion CC | INC-ENV-* |
| **P-PROD-001..003** | MÉDIA/ALTA | Resolver/fallback/promotion produção | INC-PROD-* |
| **P-MNT-001..002** | BAIXA | Heurística/menu manutenção | Monitor |
| **P-HR-001, P-HR-004** | MÉDIA | Perfil duplicado; sem promotion CC | INC-HR-* |
| **P-SST-001..004** | MÉDIA | SST parcial; sem promotion CC | INC-SST-* |
| **P-SUP-001..003** | MÉDIA | Sem perfil/runtime supply | INC-SUP-NATIVE |
| **P-QLT-001..006** | VAR | Quality greenfields + semântica open_nc | INC-035+ |
| **P-LOG-004+** | BAIXA | Massa WMS/TMS; binding 0.385 vs gate 0.5 | Dados + flags ops |

> **Resolvido em v1.1:** P-LOG-001..003 (gap `logistics_native`) — fechado por INC-036→043.

---

## Etapa 7 — Política oficial de engenharia (v1.1)

### Regra 1 — INC obrigatória (componentes nucleares)

Qualquer alteração em:

- **runtimes** cognitivos nativos (foundation, descriptor, consolidation)
- **promotion** (Z.22, NativeCockpitPromotion, supervisores)
- **loaders** homologados (Z.20 tenant signal loaders, block bridge)
- **registries** (`cognitiveBlockRegistry`, cockpit registries homologados)
- **`dashboardSurfaceCapabilities`** (SurfaceCapabilities)
- **CentroComando Shell** (geometria, mount gates, supressão widgets homologados)
- **Resolvers** homologados, **Adapters homologados**, **Signal Loaders homologados**

**Exige:**

1. **Nova INC** numerada com escopo explícito  
2. **Auditoria** read-only ou evidência prévia  
3. **Regressão completa** (quality + logistics + domain contextual + cross-domain C3/C4)  
4. **Actualização de baseline** (domínio + SYSTEM se transversal)

### Regra 2 — Evolução permitida sem quebrar baseline

- Conteúdo cognitivo (textos, insights, severidade real)  
- Novos endpoints **aditivos** scoped por tenant  
- Funcionalidades **incrementais** listadas em § Etapa 6 (Picking, OTIF, PPAP, …) em rotas/hubs novos ou enriquecimento de hubs existentes **sem alterar** cadeia Z.19→Z.23  
- Dados reais adicionais em BD  
- Microanimações cosméticas (política INC-021)

### Regra 3 — Proibido

- Mock / placeholder em runtime homologado  
- Alterar geometria UI v1.0 sem INC  
- Bypass de `dashboardSurfaceCapabilities`  
- Force-push de runtime sem binding validation  
- Modificar adapters homologados «inline» no componente  
- Tratar evoluções incrementais como «correcção de baseline» sem INC

---

## Etapa 8 — Roadmap oficial (pós v1.1)

**Fase actual:** evoluções incrementais — **não alterações arquitecturais**.

| Prioridade | Item | Tipo |
|------------|------|------|
| 1 | Picking | Evolução Logistics |
| 2 | Fleet AI | Evolução Logistics |
| 3 | PPAP | Greenfield Quality |
| 4 | MSA | Greenfield Quality |
| 5 | Ishikawa UI | Greenfield Quality |
| 6 | Finance Native | Greenfield runtime |
| 7 | Supply Native | Greenfield runtime |
| — | OTIF / Warehouse Telemetry / Supplier Intelligence | Evoluções Logistics/Quality |

Novos runtimes (`finance_native`, `supply_native`) ou promotion CC para Executivo/Produção/RH/SST/Ambiente seguem o **mesmo padrão INC** usado em Quality (INC-022→034) e Logistics (INC-036→043) — auditoria → plano → foundation → loader → binding → promotion → CC → homologação → baseline.

---

## Índice rápido — Onde encontrar cada subsistema

| Preciso de… | Documento |
|-------------|-----------|
| Arquitectura global (este release) | **Este documento** |
| Shell UI CentroComando | [BASELINE-UI-v1.0.md](BASELINE-UI-v1.0.md) |
| Perfis e superfícies | [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md) |
| Quality completo | [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) |
| Logistics completo | [BASELINE-LOGISTICS-v1.1.md](BASELINE-LOGISTICS-v1.1.md) |
| Quality homologação | [INC-034-QUALITY-HOMOLOGATION.md](INC-034-QUALITY-HOMOLOGATION.md) |
| Logistics homologação | [INC-043-LOGISTICS-HOMOLOGATION.md](INC-043-LOGISTICS-HOMOLOGATION.md) |
| Consolidação SYSTEM v1.1 | [INC-044-SYSTEM-CONSOLIDATION.md](INC-044-SYSTEM-CONSOLIDATION.md) |
| Arquitectura logistics plano | [LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md](LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md) |
| Segregação quality | [INC-022-QUALITY-SURFACE-SEGREGATION.md](INC-022-QUALITY-SURFACE-SEGREGATION.md) |
| Promoção quality | [INC-024-QUALITY-NATIVE-PROMOTION.md](INC-024-QUALITY-NATIVE-PROMOTION.md) |
| Promoção logistics | [INC-042-LOGISTICS-COMMAND-CENTER-PROMOTION.md](INC-042-LOGISTICS-COMMAND-CENTER-PROMOTION.md) |
| SYSTEM v1.0 (histórico) | [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md) |

---

## Referências INC transversais

| INC | Tema |
|-----|------|
| INC-010→013 | Forensic cognitive layer |
| INC-014→021 | Baseline UI lock |
| INC-022 | Quality surface segregation |
| INC-025 | Dashboards baseline |
| INC-028→034 | Quality runtime reconciliation chain |
| INC-036→043 | Logistics runtime reconciliation chain |
| **INC-044** | **Consolidação BASELINE-SYSTEM v1.1** |

---

## Versão e sucessão

| Versão | Data | Alteração |
|--------|------|-----------|
| SYSTEM v1.0 | 2026-07-16 | Congelamento arquitectural global inicial |
| QUALITY v1.0 → v1.1 | 2026-07-16 | Runtime + CC homologados |
| LOGISTICS v1.0 → v1.1 | 2026-07-16 | Runtime + loader + promotion + CC homologados |
| **SYSTEM v1.1** | **2026-07-16** | **Consolidação Quality + Logistics no índice mestre (INC-044)** |

**Sucessor:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) — PPAP registado via [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md) (2026-07-16).

> Este documento está **SUPERSEDED**. Usar v1.2 como índice mestre actual.
