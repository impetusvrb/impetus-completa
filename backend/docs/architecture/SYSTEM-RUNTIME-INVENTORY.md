# SYSTEM-RUNTIME-INVENTORY — Inventário Oficial IMPETUS

**Identificador:** `SYSTEM-RUNTIME-INVENTORY`  
**Versão inventário:** v1.4 (pós INC-047)  
**Data:** 2026-07-18  
**Índice mestre:** [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md)  
**Estado:** `RUNTIME_INVENTORY = LOCKED`

---

## Declaração

Inventário **oficial e congelado** dos runtimes cognitivos nativos homologados na plataforma IMPETUS.

**Total:** **11 runtimes LOCKED**  
**Alteração:** apenas via **INC** de registo ou nova homologação GF + INC.

---

## Inventário canónico (ordem oficial)

| # | Domínio | Runtime ID | Cockpit Mode | Parent Axis | CC Promotion | Hubs | Baseline | Homologação | Registo SYSTEM |
|---|---------|------------|--------------|-------------|--------------|------|----------|-------------|----------------|
| 1 | Executive | `executive_boardroom` | `executive_boardroom` | executive | NO | — | EXECUTIVE v1.0 | 2026-07-15 | v1.1 |
| 2 | Production | `production_native` | `production_native` | production | NO | — | PRODUCTION v1.0 | 2026-07-15 | v1.1 |
| 3 | Maintenance | `maintenance_native` | `maintenance_native` | maintenance | N/A | DashboardMecanico | MAINTENANCE v1.0 | 2026-07-15 | v1.1 |
| 4 | Quality | `quality_native` | `quality_native` | quality | **YES** | 3 | QUALITY v1.1 | 2026-07-16 | v1.1 |
| 5 | Logistics | `logistics_native` | `logistics_native` | logistics | **YES** | 7 | LOGISTICS v1.1 | 2026-07-16 | v1.1 |
| 6 | PPAP | `ppap_native` | `ppap_native` | quality | **YES** | 6 | PPAP v1.0 | 2026-07-16 | INC-045 (v1.2) |
| 7 | MSA | `msa_native` | `msa_native` | quality | **YES** | 6 | MSA v1.0 | 2026-07-17 | INC-046 (v1.3) |
| 8 | **Ishikawa** | **`ishikawa_native`** | **`ishikawa_native`** | quality | **YES** | **10** | **ISHIKAWA v1.0** | **2026-07-17** | **INC-047 (v1.4)** |
| 9 | Environment | `environmental_native` | `environmental_native` | environmental | NO | — | ENVIRONMENT v1.0 | 2026-07-15 | v1.1 |
| 10 | HR | `hr_native` | `hr_native` | hr | NO | — | HR v1.0 | 2026-07-15 | v1.1 |
| 11 | SST | `safety_native` | `safety_native` | safety | NO | — | SAFETY v1.0 | 2026-07-15 | v1.1 |

---

## Sub-runtimes eixo Qualidade

| Runtime | Payload Z.23 | Signal Loader | Binding piloto |
|---------|--------------|---------------|----------------|
| `quality_native` | `specialized_cockpit_runtime` | `qualityTenantSignalLoader` | homologado |
| `ppap_native` | `ppap_cognitive_runtime` | `ppapTenantSignalLoader` | 1.0 (12/12) |
| `msa_native` | `msa_cognitive_runtime` | `msaTenantSignalLoader` | 1.0 (12/12) |
| `ishikawa_native` | `ishikawa_cognitive_runtime` | `ishikawaTenantSignalLoader` | 1.0 (12/12) |

Coexistência homologada no perfil `manager_quality` quando gates satisfeitos.

---

## Greenfields pendentes (não homologados)

| Domínio | Runtime ID | Classificação | Estado GF-022 |
|---------|------------|---------------|---------------|
| Financeiro | `finance_native` | GF futuro | — |
| **Suprimentos** | **`supply_native`** | **GF-021→027** | **HOMOLOGATION COMPLETE** (GF-027) |

### Runtimes Foundation (não homologados — fora dos 11 LOCKED)

| Domínio | Runtime ID | Versão | Registo | CC | Loader | Promotion |
|---------|------------|--------|---------|:--:|:------:|:---------:|
| **Supply** | `supply_native` | 0.2.0 | GF-022…027 · REST v1 · RBAC · workspace | **HOMOLOGATION** | **YES** | **ACTIVE** |
| MSA | `msa_native` | — | GF-008 | via facade | YES | YES |
| Ishikawa | `ishikawa_native` | — | GF-015 | via facade | YES | YES |

> **11 runtimes LOCKED** permanecem inalterados. Supply GF-025 **não** incrementa SYSTEM v1.4 — registo homologado requer GF-027 + INC.

---

## WMS Operational Layer (`logistics-operational`)

| Componente | Estado WMS-003 |
|------------|:--------------:|
| Operational APIs v1 | **ACTIVE** |
| OCL | **ACTIVE** |
| Controllers | **ACTIVE** |
| Canonical Contracts | **ACTIVE** |
| RBAC API | **ACTIVE** |
| Menu / CC | **VALIDATED** (WMS-005) |
| **Integrated Pilot Validation** | **COMPLETE** (WMS-005) |
| **Operational Validation** | **COMPLETE** (WMS-005) |
| **WMS-006 Homologation** | **COMPLETE** |
| **Production Readiness** | **CERTIFIED** |
| **Workspace FE** | **ACTIVE** (WMS-004) |

**Evidência:** [WMS-004-WORKSPACE.md](../evidence/WMS-004-WORKSPACE.md) · [INC-048-CONVERGENCE.md](../evidence/INC-048-CONVERGENCE.md) · [WMS-005-EXECUTIVE-SUMMARY.md](../evidence/WMS-005-EXECUTIVE-SUMMARY.md) · [WMS-006-EXECUTIVE-SUMMARY.md](../evidence/WMS-006-EXECUTIVE-SUMMARY.md)

---

## INC-048 Integration Layer

| Componente | Estado |
|------------|:------:|
| Convergence Runtime | **ACTIVE** |
| Supply + WMS Convergence | **ACTIVE** |
| API `/api/integration/inc048` | **ACTIVE** |

---

## Supply Homologation Layer (`supply_native` — GF-027)

| Componente | Estado |
|------------|:------:|
| Supply REST APIs v1 | **ACTIVE** |
| Supply RBAC | **ACTIVE** |
| Supply Workspace | **ACTIVE** |
| Supply Homologation | **COMPLETE** |
| Pilot Integration Layer | **ACTIVE** |

**Evidência:** [GF-027-HOMOLOGATION.md](../evidence/GF-027-HOMOLOGATION.md)

---

## Histórico de inventário

| Versão | Runtimes | Delta | INC |
|--------|----------|-------|-----|
| v1.1 | 9 | Quality + Logistics homologados | INC-044 |
| v1.2 | 9 | + PPAP registado | INC-045 |
| v1.3 | 10 | + MSA registado | INC-046 |
| **v1.4** | **11** | **+ Ishikawa registado** | **INC-047** |

---


---

## Certified Baseline — BASELINE-SUPPLY-v2.0

| Campo | Valor |
|-------|-------|
| **Baseline** | **BASELINE-SUPPLY-v2.0** |
| **Status** | **CERTIFIED** |
| **Source** | REV-002 |
| **Reference Manifest** | [BASELINE-SUPPLY-v2.0-MANIFEST.json](../evidence/BASELINE-SUPPLY-v2.0-MANIFEST.json) |
| **Publication** | 2026-07-18 |
| **Configuration Freeze** | **COMPLETE** |

**Evidência:** [BASELINE-SUPPLY-v2.0-EXECUTIVE-SUMMARY.md](../evidence/BASELINE-SUPPLY-v2.0-EXECUTIVE-SUMMARY.md)

---

## Referências

- [INC-047-ARCHITECTURE-REGISTRATION.md](../evidence/INC-047-ARCHITECTURE-REGISTRATION.md)
- [ARCHITECTURE-CHANGELOG.md](ARCHITECTURE-CHANGELOG.md)
- [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md)
