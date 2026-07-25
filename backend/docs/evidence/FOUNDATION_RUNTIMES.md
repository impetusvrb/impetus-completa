# FOUNDATION RUNTIMES — Inventário complementar

**Referência:** `baselineManifest.js` · SYSTEM-RUNTIME-INVENTORY v1.4  
**Data:** 2026-07-18

---

## Runtimes Foundation (fora dos 11 LOCKED)

| Runtime | Programa | Loader | Promotion | CC | Ops Layer |
|---------|----------|:------:|:---------:|:--:|:---------:|
| `msa_native` | GF-008 | ✅ | ✅ facade | ✅ | APIs `/api/msa` |
| `ishikawa_native` | GF-015 | ✅ | ✅ facade | ✅ | APIs `/api/ishikawa` |
| **`supply_native`** | GF-022→027 | ✅ | ✅ homologation | **HOMOLOGATION** | REST v1 + Pilot Layer |

---

## WMS Operational (não-cognitivo)

| Componente | WMS-001 | WMS-002 | WMS-003 |
|------------|:-------:|:-------:|:-------:|
| Domain `logistics-operational` | ✅ | ✅ | ✅ |
| OCL | — | ✅ | **ACTIVE** |
| Core Services | — | ✅ | ✅ |
| Operational APIs v1 | — | stubs | **ACTIVE** |
| **Operational Workspace FE** | — | — | **ACTIVE** (WMS-004) |
| Controllers | — | — | **ACTIVE** |
| Canonical Contracts | ✅ | **ACTIVE** | **ACTIVE** |
| RBAC API | defs | defs | **ACTIVE** |
| Menu / CC | OFF | OFF | **VALIDATED** (WMS-005) |
| **Integrated Pilot Validation** | — | — | **COMPLETE** (WMS-005) |
| **Operational Validation** | — | — | **COMPLETE** (WMS-005) |

---

## Supply Homologation (GF-027)

| Componente | Estado |
|------------|:------:|
| Supply REST APIs v1 | **ACTIVE** |
| Supply RBAC | **ACTIVE** |
| Supply Workspace | **ACTIVE** |
| Supply Homologation | **COMPLETE** |
| Pilot Integration Layer | **ACTIVE** |

**Evidência:** [GF-027-HOMOLOGATION.md](./GF-027-HOMOLOGATION.md)

---

## INC-048 — Supply + WMS Convergence ✅

| Componente | Estado |
|------------|:------:|
| INC-048 Integration Runtime | **ACTIVE** |
| Supply + Logistics Convergence | **ACTIVE** |
| Compatibility Matrix | **ACTIVE** |

**Evidência:** [INC-048-CONVERGENCE.md](../evidence/INC-048-CONVERGENCE.md)

---

## WMS-005 — Integrated Pilot Validation ✅

| Componente | Estado |
|------------|:------:|
| Validation Runtime (`validation/wms005/`) | **ACTIVE** |
| E2E Scenario Runner | **ACTIVE** |
| Pilot Validation Matrix | **ACTIVE** |
| RBAC / Feature Flag Validation | **ACTIVE** |
| Workspace + CC Static Validation | **ACTIVE** |
| Integrated Pilot Validation | **COMPLETE** |
| Operational Validation | **COMPLETE** |

**Evidência:** [WMS-005-EXECUTIVE-SUMMARY.md](./WMS-005-EXECUTIVE-SUMMARY.md)

---

## WMS-006 — Frozen Homologation ✅

| Componente | Estado |
|------------|:------:|
| Homologation Runtime (`validation/wms006/`) | **ACTIVE** |
| WMS-005 Regression Baseline | **ACTIVE** |
| Production Readiness Checklist | **ACTIVE** |
| Baseline Candidate Manifest | **ACTIVE** |
| Controlled Activation (pilot only) | **ACTIVE** |
| WMS-006 Homologation | **COMPLETE** |
| Production Readiness | **CERTIFIED** |

**Manifest:** [WMS-006-BASELINE-CANDIDATE-MANIFEST.json](./WMS-006-BASELINE-CANDIDATE-MANIFEST.json)  
**Evidência:** [WMS-006-EXECUTIVE-SUMMARY.md](./WMS-006-EXECUTIVE-SUMMARY.md)

---

---

## Certified Baseline — BASELINE-SUPPLY-v2.0 ✅ ACTIVE

| Campo | Valor |
|-------|-------|
| Baseline | **BASELINE-SUPPLY-v2.0** |
| Status | **CERTIFIED · ACTIVE** |
| Source | REV-002 |
| Manifest | [BASELINE-SUPPLY-v2.0-MANIFEST.json](./BASELINE-SUPPLY-v2.0-MANIFEST.json) |
| Configuration Freeze | **COMPLETE** |

---

*Atualizado por:* **BASELINE-SUPPLY-v2.0** Configuration Release