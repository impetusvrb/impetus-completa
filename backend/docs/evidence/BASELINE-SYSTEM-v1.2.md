# BASELINE-SYSTEM v1.2 — Arquitetura Homologada Global do IMPETUS

**Identificador:** `BASELINE-SYSTEM-v1.2`  
**Data de congelamento:** 2026-07-16  
**Modo:** registo arquitectural (INC-045 — sem alterações de código)  
**Estado:** `SYSTEM_BASELINE_v1.2 = LOCKED`  
**Sucessor de:** [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md)  
**Evidência:** [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md)  
**Taxonomia:** [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md)

---

## Declaração canónica

Este documento é o **índice mestre e referência arquitectural única** do IMPETUS após:

- Homologação dos domínios **Qualidade** (INC-022 → INC-034) e **Logística** (INC-036 → INC-043) — SYSTEM v1.1  
- Construção greenfield e homologação **PPAP** (GF-000 → GF-006) — registo INC-045  

> **Nenhuma evolução futura poderá alterar componentes homologados sem nova INC explícita, auditoria, regressão completa e actualização de baseline.**

A partir de **BASELINE-SYSTEM v1.2**:

- **Arquitectura congelada** — 9 runtimes cognitivos nativos LOCKED  
- **Novas capacidades** — exclusivamente via **GF** (domínios novos) ou **EV** (incrementais)  
- **INC** — somente alteração estrutural da plataforma ou registo no índice mestre  

**Relatórios de homologação / registo:**

- [SYSTEM-ARCHITECTURE-HOMOLOGATION.md](SYSTEM-ARCHITECTURE-HOMOLOGATION.md) — v1.0 (histórico)
- [INC-034-QUALITY-HOMOLOGATION.md](INC-034-QUALITY-HOMOLOGATION.md) — Quality v1.1
- [INC-043-LOGISTICS-HOMOLOGATION.md](INC-043-LOGISTICS-HOMOLOGATION.md) — Logistics v1.1
- [INC-044-SYSTEM-CONSOLIDATION.md](INC-044-SYSTEM-CONSOLIDATION.md) — SYSTEM v1.1
- [GF-006-PPAP-RUNTIME-HOMOLOGATION.md](GF-006-PPAP-RUNTIME-HOMOLOGATION.md) — PPAP homologation
- [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md) — SYSTEM v1.2

---

## Critérios de encerramento (SYSTEM v1.2)

| Flag | Valor |
|------|-------|
| `SYSTEM_BASELINE_v1.2` | **LOCKED** |
| `QUALITY_BASELINE` | **LOCKED** (v1.1) |
| `LOGISTICS_BASELINE` | **LOCKED** (v1.1) |
| `PPAP_BASELINE` | **LOCKED** (v1.0) |
| `ALL_APPROVED_BASELINES_REGISTERED` | **YES** |
| `ALL_RUNTIME_REFERENCES` | **CONSISTENT** |
| `ALL_BASELINES_INDEXED` | **YES** |
| `ARCHITECTURE_CANONICAL` | **YES** |
| `RUNTIME_INVENTORY_COMPLETE` | **YES** (9 nativos) |
| `EVOLUTION_TAXONOMY_UPDATED` | **YES** |
| `ARCHITECTURE_CONFORMANCE_SUITE` | **ACTIVE** (ARC-001) |
| `ZERO_ARCHITECTURE_CHANGED` | **YES** (INC-045) |
| `ZERO_CODE_CHANGED` | **YES** (INC-045) |
| `ZERO_PM2_RESTART` | **YES** (INC-045) |

---

## Índice mestre — Baselines homologados

| Baseline | Estado | Documento | Notas |
|----------|--------|-----------|-------|
| **BASELINE_UI_v1.0** | **LOCKED** | [BASELINE-UI-v1.0.md](BASELINE-UI-v1.0.md) | Shell CentroComando desktop |
| **BASELINE_DASHBOARDS_v1.0** | **LOCKED** | [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md) | 52 perfis; matriz área×runtime×surface |
| **BASELINE_QUALITY_v1.1** | **LOCKED** | [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | `quality_native` Z22+Z23 |
| **BASELINE_LOGISTICS_v1.1** | **LOCKED** | [BASELINE-LOGISTICS-v1.1.md](BASELINE-LOGISTICS-v1.1.md) | `logistics_native` Z19→Z23 |
| **BASELINE_PPAP_v1.0** | **LOCKED** | [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) | `ppap_native` Z19→Z23 · **GF-000→006** |
| **BASELINE_EXECUTIVE_v1.0** | **LOCKED** | [BASELINE-EXECUTIVE-v1.0.md](BASELINE-EXECUTIVE-v1.0.md) | `executive_boardroom` Z27 |
| **BASELINE_PRODUCTION_v1.0** | **LOCKED** | [BASELINE-PRODUCTION-v1.0.md](BASELINE-PRODUCTION-v1.0.md) | `production_native` ZP0 |
| **BASELINE_MAINTENANCE_v1.0** | **LOCKED** | [BASELINE-MAINTENANCE-v1.0.md](BASELINE-MAINTENANCE-v1.0.md) | `maintenance_native` ZM1 |
| **BASELINE_ENVIRONMENT_v1.0** | **LOCKED** | [BASELINE-ENVIRONMENT-v1.0.md](BASELINE-ENVIRONMENT-v1.0.md) | `environmental_native` P1 |
| **BASELINE_HR_v1.0** | **LOCKED** | [BASELINE-HR-v1.0.md](BASELINE-HR-v1.0.md) | `hr_native` Z26 |
| **BASELINE_SAFETY_v1.0** | **LOCKED** | [BASELINE-SAFETY-v1.0.md](BASELINE-SAFETY-v1.0.md) | `safety_native` Z25 (SST) |
| **BASELINE_SUPPLY_v1.0** | **LOCKED** | [BASELINE-SUPPLY-v1.0.md](BASELINE-SUPPLY-v1.0.md) | Colapsado em logística; runtime **GREENFIELD** |
| **SECURITY_BASELINE_01** | **LOCKED** | [security-baseline-01/](security-baseline-01/) | Superfície segurança infra |
| **BASELINE-SYSTEM_v1.1** | **SUPERSEDED** | [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) | Substituído por este documento |
| **BASELINE-SYSTEM_v1.0** | **SUPERSEDED** | [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md) | Histórico |

### Estado global consolidado (v1.2)

| Dimensão | Estado |
|----------|--------|
| UI Shell CC | **LOCKED** (v1.0) |
| Dashboards organizacionais | **LOCKED** (v1.0) |
| Quality domain | **LOCKED v1.1** |
| Logistics domain | **LOCKED v1.1** |
| **PPAP sub-runtime** | **LOCKED v1.0** — **novo em v1.2** |
| Cross-surface contamination | **PARTIAL** (débitos P-* documentados) |
| Runtime resolution | **9 nativos LOCKED** + 2 greenfields (finance, supply) |
| Taxonomia evolução | **LOCKED** — EVOLUTION-TAXONOMY v1.0 |

---

## Etapa 1 — Inventário de runtimes cognitivos

Classificação oficial pós INC-045:

| # | Domínio | Runtime ID canónico | Camada | Estado | CC Promotion | Baseline | Homologação |
|---|---------|---------------------|--------|--------|--------------|----------|-------------|
| 1 | **Executivo** | `executive_boardroom` | Z27 | **LOCKED** | NO | EXECUTIVE v1.0 | 2026-07-15 |
| 2 | **Produção** | `production_native` | ZP0 | **LOCKED** | NO | PRODUCTION v1.0 | 2026-07-15 |
| 3 | **Manutenção** | `maintenance_native` | ZM1 | **LOCKED** | N/A (DashboardMecanico) | MAINTENANCE v1.0 | 2026-07-15 |
| 4 | **Qualidade** | `quality_native` | Z22+Z23 | **LOCKED** | **YES** | QUALITY v1.1 | 2026-07-16 |
| 5 | **Logística** | `logistics_native` | Z19→Z23 | **LOCKED** | **YES** | LOGISTICS v1.1 | 2026-07-16 |
| 6 | **Meio Ambiente** | `environmental_native` | P1 | **LOCKED** | NO | ENVIRONMENT v1.0 | 2026-07-15 |
| 7 | **RH** | `hr_native` | Z26 | **LOCKED** | NO | HR v1.0 | 2026-07-15 |
| 8 | **SST** | `safety_native` | Z25 | **LOCKED** | NO | SAFETY v1.0 | 2026-07-15 |
| 9 | **PPAP** | `ppap_native` | Z19→Z23 | **LOCKED** | **YES** | **PPAP v1.0** | **2026-07-16** |
| — | Financeiro | — | — | **GREENFIELD** | NO | — | — |
| — | Suprimentos | — | — | **GREENFIELD** | NO | SUPPLY v1.0 (doc) | — |

> **PPAP** é sub-runtime do eixo Qualidade — payload isolado `ppap_cognitive_runtime`; coexistência com `quality_native` homologada (GF-006).

> **Nomenclatura executive:** família `executive_native` = runtime ID `executive_boardroom`.

**Render promotion global:** `IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled`

### Catálogo Greenfields concluídos

| Greenfield | Sequência | Runtime | Baseline | Registo SYSTEM |
|------------|-----------|---------|----------|----------------|
| **PPAP** | GF-000 → GF-006 | `ppap_native` | v1.0 | INC-045 (v1.2) |

### Fases runtime transversais

| Fase | Responsabilidade | Estado |
|------|------------------|--------|
| Z.19 | Feature flags / pilot runtime | LOCKED |
| Z.20 | Engine bridge + signal loaders | LOCKED (Quality · Logistics · **PPAP**) |
| Z.21 | Operational metrics + insights | LOCKED (Quality); paths dedicados por domínio |
| Z.22 | Render promotion | LOCKED (Quality · Logistics · **PPAP**) |
| Z.23 | Cockpit consolidation | LOCKED (Quality · Logistics · **PPAP**) |
| C3–C6 | Authority, truth, convergence | ACTIVE |
| Security Recon | Pre/post-auth guard | LOCKED |

---

## Etapa 2 — Matriz única de domínios cognitivos

| Domínio | Runtime ID | Loader (Z.20) | Promotion (Z.22) | Hubs CC | Baseline | Estado |
|---------|------------|---------------|------------------|---------|----------|--------|
| **Executivo** | `executive_boardroom` | N/A (Z27) | NO | NO | EXECUTIVE v1.0 | **LOCKED** |
| **Produção** | `production_native` | production* | NO | NO | PRODUCTION v1.0 | **LOCKED** |
| **Manutenção** | `maintenance_native` | maintenance* | NO | DashboardMecanico | MAINTENANCE v1.0 | **LOCKED** |
| **Qualidade** | `quality_native` | `qualityTenantSignalLoader` | `QualityNativeCockpitPromotion` | 3 hubs + Z.23 | QUALITY v1.1 | **LOCKED** |
| **Logística** | `logistics_native` | `logisticsTenantSignalLoader` | `LogisticsNativeCockpitPromotion` | 7 hubs | LOGISTICS v1.1 | **LOCKED** |
| **PPAP** | `ppap_native` | `ppapTenantSignalLoader` | `PpapNativeCockpitPromotion` | 6 hubs | **PPAP v1.0** | **LOCKED** |
| **Meio Ambiente** | `environmental_native` | environmental* | NO | NO | ENVIRONMENT v1.0 | **LOCKED** |
| **RH** | `hr_native` | hr* | NO | NO | HR v1.0 | **LOCKED** |
| **Segurança (SST)** | `safety_native` | safety* | NO | NO | SAFETY v1.0 | **LOCKED** |
| **Financeiro** | — | — | — | — | — | **GREENFIELD** |
| **Suprimentos** | — | — | — | — | SUPPLY v1.0 (doc) | **GREENFIELD** |

**Paridade arquitectural homologada (Quality · Logistics · PPAP):**

| Capacidade | Quality | Logistics | PPAP |
|------------|---------|-----------|------|
| Runtime foundation | ✅ | ✅ | ✅ GF-001 |
| Signal loader real | ✅ | ✅ | ✅ GF-003 |
| Binding gate-driven | ✅ | ✅ | ✅ GF-003/005 |
| Promotion Z.22→Z.23 | ✅ | ✅ | ✅ GF-004 |
| CC native promotion | ✅ | ✅ | ✅ GF-004 |
| Baseline homologação | v1.1 | v1.1 | **v1.0** |
| Payload canónico | `specialized_cockpit_runtime` | `logistics_cognitive_runtime` | **`ppap_cognitive_runtime`** |
| Sequência origem | INC-022→034 | INC-036→043 | **GF-000→006** |

---

## Etapa 3 — Cadeia arquitectural oficial (v1.2)

```
Cadastro Estrutural
  (users + structural_profile + functional_area + department)
        ↓
GET /api/dashboard/me
  (routes/dashboard.js → cognitiveRuntimeFacade)
        ↓
dashboardSurfaceCapabilities
  (fail-closed INC-009/022)
        ↓
Runtime resolution
  (cockpit_mode: quality_native | logistics_native | ppap_native | …)
        ↓
Z.19 Feature Flags / Pilot
        ↓
Z.20 Signal Loaders + Engine Bridge
  (qualityTenantSignalLoader, logisticsTenantSignalLoader, ppapTenantSignalLoader, …)
        ↓
Z.21 Domain Adapters
        ↓
Z.22 Render Promotion
  (supervisores passivos · gate-driven)
        ↓
Z.23 Consolidation
  (specialized_cockpit_runtime | logistics_cognitive_runtime | ppap_cognitive_runtime)
        ↓
Native Cockpit Promotion
  (Quality | Logistics | PPAP NativeCockpitPromotion)
        ↓
CentroComando Shell
        ↓
Hubs
        ↓
Adapters (frontend)
        ↓
APIs oficiais + datasets BD
```

**Delta v1.1 → v1.2:** ramo **PPAP** adicionado à cadeia oficial — sem alteração dos ramos Quality / Logistics homologados.

---

## Etapa 4 — Superfícies protegidas

| Superfície | Perfis | Modificável sem INC? | Baseline |
|------------|--------|----------------------|----------|
| **CentroComando** | Multi-domínio | **NÃO** | UI + DASHBOARDS |
| **Quality Native hubs** | quality profiles | **NÃO** | QUALITY v1.1 |
| **Logistics Native hubs** | logistics profiles | **NÃO** | LOGISTICS v1.1 |
| **PPAP Native hubs** | quality profiles (gate) | **NÃO** | **PPAP v1.0** |
| **DashboardMecanico** | Manutenção | **NÃO** | MAINTENANCE |
| **DashboardOperador** | `operator_floor` | **NÃO** | PRODUCTION |
| **Portal Admin — SOC** | admin JWT | **NÃO** | SEC_VISUAL |
| **Security Recon** | global | **NÃO** | SEC_RECON |

---

## Etapa 5 — Componentes congelados (núcleo transversal)

| Componente | Classificação | Path |
|------------|---------------|------|
| `cognitiveRuntimeFacade` | **LOCKED** | `backend/src/cognitiveRuntime/facade/` |
| `dashboardSurfaceCapabilities` | **LOCKED** | `frontend/src/utils/` |
| **Quality** — loader / promotion / adapters | **LOCKED** | paths INC-034 |
| **Logistics** — loader / promotion / consolidation | **LOCKED** | paths INC-043 |
| **PPAP** — loader / promotion / consolidation | **LOCKED** | paths GF-003→006 |
| `securityReconMiddleware` | **LOCKED** | `backend/src/securityRecon/` |
| Domain cockpit resolvers | **EXTENSÍVEL** | via GF/INC |
| `cognitiveBlockRegistry` | **EXTENSÍVEL** | novos blocks via INC |

---

## Etapa 6 — Débitos arquiteturais consolidados

### Greenfields pendentes

| Item | Domínio | Classificação |
|------|---------|---------------|
| **MSA** | Quality | GF futuro |
| **Ishikawa UI** | Quality | EV / GF |
| **5 Porquês** | Quality | NÃO IMPLEMENTADO |
| **Finance Native** | Finance | **GREENFIELD** |
| **Supply Native** | Supply | **GREENFIELD** |
| Promotion CC Executivo / Produção / RH / SST / Ambiente | Respective | GREENFIELD |

### Resolvido em v1.2

| Item v1.1 | Resolução |
|-----------|-----------|
| **PPAP** — NÃO IMPLEMENTADO | **LOCKED** — `ppap_native` · BASELINE-PPAP-v1.0 |
| P-LOG-001..003 | Fechado v1.1 (logistics_native) |

### Evoluções incrementais (EV)

| Item | Domínio |
|------|---------|
| Picking | Logistics |
| Fleet AI / OTIF | Logistics |
| APQP / extensão PPAP | PPAP (EV sobre v1.0) |
| Supplier Intelligence | Logistics / Quality |
| Traceability Hub | Quality |

---

## Etapa 7 — Política oficial de engenharia (v1.2)

Política detalhada: [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md)

### Regra 1 — INC obrigatória

Alterações em runtimes homologados, promotion, loaders, registries homologados, SurfaceCapabilities, CentroComando shell → **INC + auditoria + regressão + baseline**.

### Regra 2 — GF para domínios novos

Seguir sequência GF-000→GF-006; baseline próprio; registo SYSTEM via **INC de registo** (modelo INC-045).

### Regra 3 — EV para incrementais

Funcionalidade nova sobre LOCKED **sem** alterar cadeia Z.19→Z.23 homologada.

### Regra 4 — Proibido

- Mock em runtime homologado  
- Bypass de binding / SurfaceCapabilities  
- Tratar EV/GF como «correcção de baseline» sem INC  
- Alterar SYSTEM index sem INC  

---

## Etapa 8 — Roadmap oficial (pós v1.2)

| Prioridade | Item | Tipo |
|------------|------|------|
| — | ~~PPAP~~ | ✅ **Concluído** (GF-000→006 + INC-045) |
| 1 | MSA | GF Quality |
| 2 | Ishikawa UI | EV / GF |
| 3 | Picking | EV Logistics |
| 4 | Fleet AI | EV Logistics |
| 5 | Finance Native | GF runtime |
| 6 | Supply Native | GF runtime |

---

## Etapa 9 — Architecture Conformance Suite (ARC-001)

**Estado:** `ARCHITECTURE_CONFORMANCE_SUITE = ACTIVE`  
**Evidência:** [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md)  
**Comando:** `npm run test:architecture-conformance`

### Objectivo

Gate automático de **conformidade arquitectural** — detecta violações de contrato **antes** das homologações funcionais por domínio. A suíte **não altera** runtimes, loaders, promotion, UI ou BD.

### Cobertura de contratos (v1.0)

| Categoria | ID | Valida |
|-----------|-----|--------|
| Runtime Registry | ARC-001A | 9 runtimes homologados em `cognitiveDomainRegistry` |
| Loader Contract | ARC-001B | Signal loaders + binding shape (tenant vazio) |
| Payload Contract | ARC-001C | Estrutura mínima `/dashboard/me` por domínio |
| Promotion Contract | ARC-001D | Gate binding · PPAP sem bypass · sem DB em supervisors |
| SurfaceCapabilities | ARC-001E | Baseline INC-022 fail-closed |
| Centro de Comando | ARC-001F | OFF/ON hub mount · registries Quality/Logistics/PPAP |
| Threshold Policy | ARC-001G | Z.21/Z.22/Z.23 congelados (0.5 / 0.35 / …) |
| Baseline Integrity | ARC-001H | Docs SYSTEM v1.2 · PPAP v1.0 · TAXONOMY · GF-000→006 |

### Política de execução

| Contexto | Regra |
|----------|-------|
| **Pré-merge CI** | `test:architecture-conformance` **obrigatório** — FAIL bloqueia merge |
| **Determinismo** | Tenant vazio `00000000-…0099` — sem dados de produção |
| **Alteração golden manifest** | Requer **INC** — `baselineManifest.js` espelha SYSTEM v1.2 |
| **Homologação domínio** | ARC-001 **complementa** (não substitui) testes GF/INC por domínio |

### Integração CI (recomendada)

```yaml
# Exemplo — executar antes de testes funcionais
- run: npm run test:architecture-conformance
  working-directory: backend
```

**Resultado PASS** → merge permitido · **FAIL** → mensagem indica categoria e contrato violado.

---

## Índice rápido

| Preciso de… | Documento |
|-------------|-----------|
| Arquitectura global (este release) | **Este documento** |
| Taxonomia INC/GF/EV | [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md) |
| Conformidade arquitectural | [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md) |
| PPAP completo | [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) |
| PPAP homologação | [GF-006-PPAP-RUNTIME-HOMOLOGATION.md](GF-006-PPAP-RUNTIME-HOMOLOGATION.md) |
| PPAP registo SYSTEM | [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md) |
| Quality | [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) |
| Logistics | [BASELINE-LOGISTICS-v1.1.md](BASELINE-LOGISTICS-v1.1.md) |
| SYSTEM v1.1 (histórico) | [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) |

---

## Referências INC / GF transversais

| ID | Tema |
|----|------|
| INC-022→034 | Quality runtime chain |
| INC-036→043 | Logistics runtime chain |
| INC-044 | SYSTEM v1.1 consolidação |
| **INC-045** | **PPAP registo · SYSTEM v1.2** |
| **ARC-001** | **Architecture Conformance Suite** |
| GF-000→006 | PPAP greenfield completo |

---

## Versão e sucessão

| Versão | Data | Alteração |
|--------|------|-----------|
| SYSTEM v1.0 | 2026-07-16 | Congelamento global inicial |
| SYSTEM v1.1 | 2026-07-16 | Quality + Logistics (INC-044) |
| **SYSTEM v1.2** | **2026-07-16** | **PPAP registado · 9 runtimes · taxonomia INC/GF/EV (INC-045)** |
| **ARC-001** | **2026-07-16** | **Architecture Conformance Suite v1.0** |

**Próxima evolução SYSTEM:** `BASELINE-SYSTEM-v1.3` apenas após nova INC transversal (ex.: registo Finance/Supply native, ou alteração nucleares § Etapa 7).
