# BASELINE-SYSTEM v1.4 — Arquitetura Homologada Global do IMPETUS

**Identificador:** `BASELINE-SYSTEM-v1.4`  
**Data de congelamento:** 2026-07-17  
**Modo:** registo arquitectural (INC-047 — sem alterações de código)  
**Estado:** `SYSTEM_BASELINE_v1.4 = LOCKED`  
**Sucessor de:** [BASELINE-SYSTEM-v1.3.md](BASELINE-SYSTEM-v1.3.md)  
**Evidência:** [INC-047-ARCHITECTURE-REGISTRATION.md](../evidence/INC-047-ARCHITECTURE-REGISTRATION.md)  
**Taxonomia:** [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md)  
**Inventário:** [SYSTEM-RUNTIME-INVENTORY.md](SYSTEM-RUNTIME-INVENTORY.md)

---

## Declaração canónica

Este documento é o **índice mestre e referência arquitectural única** do IMPETUS após:

- Homologação **Qualidade** e **Logística** — SYSTEM v1.1  
- Registo **PPAP** (INC-045) — SYSTEM v1.2  
- Registo **MSA** (INC-046) — SYSTEM v1.3  
- Registo **Ishikawa** (GF-014 → GF-020 + **INC-047**) — **SYSTEM v1.4**

> **Nenhuma evolução futura poderá alterar componentes homologados sem nova INC explícita, auditoria, regressão completa e actualização de baseline.**

A partir de **BASELINE-SYSTEM v1.4**:

- **Arquitectura congelada** — **11 runtimes cognitivos nativos LOCKED**  
- **Novas capacidades** — exclusivamente via **GF** (domínios novos) ou **EV** (incrementais)  
- **INC** — somente alteração estrutural da plataforma ou registo no índice mestre  

**Relatórios de homologação / registo:**

- [GF-020-ISHIKAWA-HOMOLOGATION.md](../evidence/GF-020-ISHIKAWA-HOMOLOGATION.md) · [INC-047-ARCHITECTURE-REGISTRATION.md](../evidence/INC-047-ARCHITECTURE-REGISTRATION.md)
- [GF-013-MSA-HOMOLOGATION.md](../evidence/GF-013-MSA-HOMOLOGATION.md) · [INC-046-ARCHITECTURE-REGISTRATION.md](../evidence/INC-046-ARCHITECTURE-REGISTRATION.md)
- [ARC-001-ARCHITECTURE-CONFORMANCE.md](../evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md)

---

## Critérios de encerramento (SYSTEM v1.4)

| Flag | Valor |
|------|-------|
| `SYSTEM_BASELINE_v1.4` | **LOCKED** |
| `QUALITY_BASELINE` | **LOCKED** (v1.1) |
| `LOGISTICS_BASELINE` | **LOCKED** (v1.1) |
| `PPAP_BASELINE` | **LOCKED** (v1.0) |
| `MSA_BASELINE` | **LOCKED** (v1.0) |
| `ISHIKAWA_BASELINE` | **LOCKED** (v1.0) — **novo em v1.4** |
| `ALL_APPROVED_BASELINES_REGISTERED` | **YES** |
| `RUNTIME_INVENTORY_COMPLETE` | **YES** (11 nativos) |
| `ARCHITECTURE_CONFORMANCE_SUITE` | **ACTIVE** (ARC-001) |
| `ZERO_CODE_CHANGED` | **YES** (INC-047) |

---

## Índice mestre — Baselines homologados

| Baseline | Estado | Documento | Notas |
|----------|--------|-----------|-------|
| **BASELINE_UI_v1.0** | **LOCKED** | [BASELINE-UI-v1.0.md](../evidence/BASELINE-UI-v1.0.md) | Shell CentroComando |
| **BASELINE_DASHBOARDS_v1.0** | **LOCKED** | [BASELINE-DASHBOARDS-v1.0.md](../evidence/BASELINE-DASHBOARDS-v1.0.md) | 52 perfis |
| **BASELINE_QUALITY_v1.1** | **LOCKED** | [BASELINE-QUALITY-v1.1.md](../evidence/BASELINE-QUALITY-v1.1.md) | `quality_native` |
| **BASELINE_LOGISTICS_v1.1** | **LOCKED** | [BASELINE-LOGISTICS-v1.1.md](../evidence/BASELINE-LOGISTICS-v1.1.md) | `logistics_native` |
| **BASELINE_PPAP_v1.0** | **LOCKED** | [BASELINE-PPAP-v1.0.md](../evidence/BASELINE-PPAP-v1.0.md) | `ppap_native` |
| **BASELINE_MSA_v1.0** | **LOCKED** | [BASELINE-MSA-v1.0.md](BASELINE-MSA-v1.0.md) | `msa_native` |
| **BASELINE_ISHIKAWA_v1.0** | **LOCKED** | [BASELINE-ISHIKAWA-v1.0.md](../evidence/BASELINE-ISHIKAWA-v1.0.md) | `ishikawa_native` · **GF-014→020** |
| **BASELINE_EXECUTIVE_v1.0** | **LOCKED** | [BASELINE-EXECUTIVE-v1.0.md](../evidence/BASELINE-EXECUTIVE-v1.0.md) | `executive_boardroom` |
| **BASELINE_PRODUCTION_v1.0** | **LOCKED** | [BASELINE-PRODUCTION-v1.0.md](../evidence/BASELINE-PRODUCTION-v1.0.md) | `production_native` |
| **BASELINE_MAINTENANCE_v1.0** | **LOCKED** | [BASELINE-MAINTENANCE-v1.0.md](../evidence/BASELINE-MAINTENANCE-v1.0.md) | `maintenance_native` |
| **BASELINE_ENVIRONMENT_v1.0** | **LOCKED** | [BASELINE-ENVIRONMENT-v1.0.md](../evidence/BASELINE-ENVIRONMENT-v1.0.md) | `environmental_native` |
| **BASELINE_HR_v1.0** | **LOCKED** | [BASELINE-HR-v1.0.md](../evidence/BASELINE-HR-v1.0.md) | `hr_native` |
| **BASELINE_SAFETY_v1.0** | **LOCKED** | [BASELINE-SAFETY-v1.0.md](../evidence/BASELINE-SAFETY-v1.0.md) | `safety_native` (SST) |
| **BASELINE-SYSTEM_v1.3** | **SUPERSEDED** | [BASELINE-SYSTEM-v1.3.md](BASELINE-SYSTEM-v1.3.md) | Substituído por este documento |

### Estado global consolidado (v1.4)

| Dimensão | Estado |
|----------|--------|
| UI Shell CC | **LOCKED** (v1.0) |
| Quality domain | **LOCKED v1.1** |
| Logistics domain | **LOCKED v1.1** |
| PPAP sub-runtime | **LOCKED v1.0** |
| MSA sub-runtime | **LOCKED v1.0** |
| **Ishikawa sub-runtime** | **LOCKED v1.0** — **novo em v1.4** |
| Runtime resolution | **11 nativos LOCKED** + 2 greenfields (finance, supply) |
| Taxonomia evolução | **LOCKED** — [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md) |

---

## Etapa 1 — Inventário de runtimes cognitivos (11 homologados)

Ver inventário detalhado: [SYSTEM-RUNTIME-INVENTORY.md](SYSTEM-RUNTIME-INVENTORY.md)

| # | Domínio | Runtime ID | Camada | CC Promotion | Baseline | Homologação |
|---|---------|------------|--------|--------------|----------|-------------|
| 1 | **Executive** | `executive_boardroom` | Z27 | NO | EXECUTIVE v1.0 | 2026-07-15 |
| 2 | **Production** | `production_native` | ZP0 | NO | PRODUCTION v1.0 | 2026-07-15 |
| 3 | **Maintenance** | `maintenance_native` | ZM1 | N/A | MAINTENANCE v1.0 | 2026-07-15 |
| 4 | **Quality** | `quality_native` | Z22+Z23 | **YES** | QUALITY v1.1 | 2026-07-16 |
| 5 | **Logistics** | `logistics_native` | Z19→Z23 | **YES** | LOGISTICS v1.1 | 2026-07-16 |
| 6 | **PPAP** | `ppap_native` | Z19→Z23 | **YES** | PPAP v1.0 | 2026-07-16 |
| 7 | **MSA** | `msa_native` | Z19→Z23 | **YES** | MSA v1.0 | 2026-07-17 |
| 8 | **Ishikawa** | `ishikawa_native` | Z19→Z23 | **YES** | **ISHIKAWA v1.0** | **2026-07-17** |
| 9 | **Environment** | `environmental_native` | P1 | NO | ENVIRONMENT v1.0 | 2026-07-15 |
| 10 | **HR** | `hr_native` | Z26 | NO | HR v1.0 | 2026-07-15 |
| 11 | **SST** | `safety_native` | Z25 | NO | SAFETY v1.0 | 2026-07-15 |

| — | Financeiro | — | — | **GREENFIELD** | — | — |
| — | Suprimentos | — | — | **GREENFIELD** | SUPPLY v1.0 (doc) | — |

> **PPAP**, **MSA** e **Ishikawa** são sub-runtimes do eixo Qualidade — payloads isolados; coexistência homologada com `quality_native`.

### Catálogo Greenfields concluídos

| Greenfield | Sequência | Runtime | Baseline | Registo SYSTEM |
|------------|-----------|---------|----------|----------------|
| **PPAP** | GF-000 → GF-006 | `ppap_native` | v1.0 | INC-045 (v1.2) |
| **MSA** | GF-007 → GF-013 | `msa_native` | v1.0 | INC-046 (v1.3) |
| **Ishikawa** | GF-014 → GF-020 | `ishikawa_native` | v1.0 | **INC-047 (v1.4)** |

### Fases runtime transversais

| Fase | Responsabilidade | Estado |
|------|------------------|--------|
| Z.19 | Feature flags / pilot runtime | LOCKED |
| Z.20 | Signal loaders + engine bridge | LOCKED (Quality · Logistics · PPAP · MSA · **Ishikawa**) |
| Z.21 | Operational metrics + insights | LOCKED (Quality); paths dedicados por domínio |
| Z.22 | Render promotion | LOCKED (Quality · Logistics · PPAP · MSA · **Ishikawa**) |
| Z.23 | Cockpit consolidation | LOCKED (Quality · Logistics · PPAP · MSA · **Ishikawa**) |

---

## Etapa 2 — Matriz de domínios cognitivos

| Domínio | Runtime ID | Loader (Z.20) | Promotion CC | Hubs CC | Baseline |
|---------|------------|---------------|--------------|---------|----------|
| Executive | `executive_boardroom` | N/A | NO | NO | EXECUTIVE v1.0 |
| Production | `production_native` | production* | NO | NO | PRODUCTION v1.0 |
| Maintenance | `maintenance_native` | maintenance* | NO | DashboardMecanico | MAINTENANCE v1.0 |
| Quality | `quality_native` | `qualityTenantSignalLoader` | `QualityNativeCockpitPromotion` | 3 hubs | QUALITY v1.1 |
| Logistics | `logistics_native` | `logisticsTenantSignalLoader` | `LogisticsNativeCockpitPromotion` | 7 hubs | LOGISTICS v1.1 |
| PPAP | `ppap_native` | `ppapTenantSignalLoader` | `PpapNativeCockpitPromotion` | 6 hubs | PPAP v1.0 |
| MSA | `msa_native` | `msaTenantSignalLoader` | `MsaNativeCockpitPromotion` | 6 hubs | MSA v1.0 |
| **Ishikawa** | **`ishikawa_native`** | **`ishikawaTenantSignalLoader`** | **`IshikawaNativeCockpitPromotion`** | **10 hubs** | **ISHIKAWA v1.0** |
| Environment | `environmental_native` | environmental* | NO | NO | ENVIRONMENT v1.0 |
| HR | `hr_native` | hr* | NO | NO | HR v1.0 |
| SST | `safety_native` | safety* | NO | NO | SAFETY v1.0 |

**Paridade arquitectural homologada (Quality · Logistics · PPAP · MSA · Ishikawa):**

| Capacidade | Quality | Logistics | PPAP | MSA | Ishikawa |
|------------|---------|-----------|------|-----|----------|
| Runtime foundation | ✅ | ✅ | ✅ | ✅ | ✅ GF-015 |
| Signal loader real | ✅ | ✅ | ✅ | ✅ | ✅ GF-017 |
| Binding gate-driven | ✅ | ✅ | ✅ | ✅ | ✅ GF-019 |
| Promotion Z.22→Z.23 | ✅ | ✅ | ✅ | ✅ | ✅ GF-018 |
| CC native promotion | ✅ | ✅ | ✅ | ✅ | ✅ GF-018 |
| Baseline homologação | v1.1 | v1.1 | v1.0 | v1.0 | **v1.0** |

---

## Etapa 3 — Cadeia arquitectural oficial (v1.4)

```
Cadastro Estrutural
        ↓
GET /api/dashboard/me  →  cognitiveRuntimeFacade
        ↓
dashboardSurfaceCapabilities  (fail-closed)
        ↓
Runtime resolution  (quality_native | logistics_native | ppap_native | msa_native | ishikawa_native | …)
        ↓
Z.19 Pilot  →  Z.20 Signal Loaders  →  Z.21 Adapters
        ↓
Z.22 Render Promotion  (gate-driven · sem bypass)
        ↓
Z.23 Consolidation  (payloads canónicos por domínio)
        ↓
Native Cockpit Promotion  (Quality | Logistics | PPAP | MSA | Ishikawa)
        ↓
CentroComando Shell  →  Hubs  →  Adapters  →  APIs + BD
```

**Delta v1.3 → v1.4:** ramo **Ishikawa** adicionado — sem alteração dos ramos homologados anteriormente.

---

## Etapa 4 — Superfícies protegidas

| Superfície | Modificável sem INC? | Baseline |
|------------|----------------------|----------|
| CentroComando shell | **NÃO** | UI + DASHBOARDS |
| Quality / Logistics / PPAP / MSA / **Ishikawa** native hubs | **NÃO** | Respective v1.x |
| DashboardMecanico | **NÃO** | MAINTENANCE |
| Security Recon | **NÃO** | SEC_RECON |

---

## Etapa 5 — Cadeia GF Ishikawa (referência)

| GF | Entrega | STATUS |
|----|---------|--------|
| GF-014 | Discovery | **COMPLETED** |
| GF-015 | Runtime Foundation | **COMPLETED** |
| GF-016 | Core Domain | **COMPLETED** |
| GF-017 | Signal Loader | **COMPLETED** |
| GF-018 | Promotion + CC | **COMPLETED** |
| GF-019 | Pilot Enablement | **COMPLETED** |
| GF-020 | Homologation | **COMPLETED** |
| INC-047 | Registo SYSTEM v1.4 | **COMPLETED** |

---

## Etapa 6 — Débitos arquitecturais (pós v1.4)

### Resolvido em v1.4

| Item v1.3 | Resolução |
|-----------|-----------|
| **Ishikawa** — EV / GF Quality pendente | **LOCKED** — `ishikawa_native` · BASELINE-ISHIKAWA-v1.0 |

### Greenfields pendentes

| Item | Classificação |
|------|---------------|
| Finance Native | **GREENFIELD** |
| Supply Native | **GREENFIELD** |
| Picking / Fleet AI | EV Logistics |
| APQP extensão | EV PPAP |

### Recomendação pós v1.4

Pausa no crescimento horizontal · consolidação plataforma · revisão documentação · planeamento próxima GF (Finance ou Supply).

---

## Etapa 7 — Política de engenharia (v1.4)

Ver [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md):

1. **INC** — alteração estrutural ou registo SYSTEM  
2. **GF** — domínio novo (sequência GF-000→GF-006, GF-007→GF-013, GF-014→GF-020) + INC registo  
3. **EV** — incremental sobre LOCKED  

---

## Etapa 8 — Architecture Conformance (ARC-001)

**Estado:** `ARCHITECTURE_CONFORMANCE_SUITE = ACTIVE`  
**Comando:** `npm run test:architecture-conformance`

Gate automático **obrigatório** pré-merge — detecta violações de contrato **sem alterar** runtimes.

| Contexto | Regra |
|----------|-------|
| Pré-merge CI | ARC-001 **obrigatório** — FAIL bloqueia merge |
| INC Registration | ARC-001 **PASS** sem alteração de contratos |
| Alteração golden manifest | Requer **INC** explícita |

---

## Índice rápido

| Preciso de… | Documento |
|-------------|-----------|
| Arquitectura global (este release) | **Este documento** |
| Inventário runtimes | [SYSTEM-RUNTIME-INVENTORY.md](SYSTEM-RUNTIME-INVENTORY.md) |
| Changelog SYSTEM | [ARCHITECTURE-CHANGELOG.md](ARCHITECTURE-CHANGELOG.md) |
| Taxonomia INC/GF/EV | [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md) |
| Ishikawa baseline | [BASELINE-ISHIKAWA-v1.0.md](../evidence/BASELINE-ISHIKAWA-v1.0.md) |
| Ishikawa registo SYSTEM | [INC-047-ARCHITECTURE-REGISTRATION.md](../evidence/INC-047-ARCHITECTURE-REGISTRATION.md) |
| Conformidade | [ARC-001-ARCHITECTURE-CONFORMANCE.md](../evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md) |
| SYSTEM v1.3 (histórico) | [BASELINE-SYSTEM-v1.3.md](BASELINE-SYSTEM-v1.3.md) |

---

## Versão e sucessão

| Versão | Data | Alteração |
|--------|------|-----------|
| SYSTEM v1.3 | 2026-07-17 | MSA registado · 10 runtimes (INC-046) |
| **SYSTEM v1.4** | **2026-07-17** | **Ishikawa registado · 11 runtimes · INC-047** |

**Próxima evolução SYSTEM:** `BASELINE-SYSTEM-v1.5` apenas após nova INC transversal (ex.: registo Finance/Supply native).
