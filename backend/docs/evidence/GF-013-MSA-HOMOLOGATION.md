# GF-013 — MSA Runtime Homologation & Baseline v1.0

**Data:** 2026-07-17  
**Tipo:** homologação controlada · congelamento domínio  
**Pré-requisitos:** [GF-012-MSA-PILOT-ENABLEMENT.md](GF-012-MSA-PILOT-ENABLEMENT.md) · [GF-011-MSA-PROMOTION.md](GF-011-MSA-PROMOTION.md) · [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md)  
**Baseline gerado:** [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md)

---

## Objetivo

Homologar oficialmente o runtime **`msa_native`**, validando a cadeia **Z.19 → Z.23** com dados reais do piloto GF-012 e publicar **BASELINE-MSA-v1.0** — **sem alterar** BASELINE-SYSTEM v1.2 (INC-046 futura).

| Modo | Condição | Comportamento esperado |
|------|----------|------------------------|
| **Runtime OFF** | Tenant sem massa · `binding_ratio = 0` | `inactive=true` · `promotion_applied=false` · sem hubs |
| **Runtime ON** | `binding_ratio = 1.0` + flags homologadas | Promoção **automática** Z.22→Z.23 · sem `force_*` |

---

## Gate de validação final

| Flag | Valor |
|------|-------|
| `MSA_RUNTIME_HOMOLOGATED` | **YES** |
| `OFF_SCENARIO_VALIDATED` | **YES** |
| `ON_SCENARIO_VALIDATED` | **YES** |
| `PROMOTION_AUTOMATIC` | **YES** |
| `NO_BYPASS` | **YES** |
| `MSA_BINDING_RATIO` | **1.0** (12/12) |
| `MSA_SIGNAL_READINESS` | **ready** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `ARC_001_CONFORMANCE` | **PASS** (75/75) |
| `BASELINE_MSA_v1.0` | **PUBLISHED** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |

---

## Pré-condições (pré-activação)

Evidência com **flags MSA OFF** no tenant piloto:

| Métrica | Valor |
|---------|-------|
| `binding_ratio` | `1.0` |
| `signal_readiness` | `ready` |
| `promotion_applied` | `false` |
| `consolidation_applied` | `false` |
| `inactive` | `true` |

Gate objectivamente satisfeito **antes** de activar flags — promoção posterior provou ser consequência natural dos critérios.

---

## Cenário 1 — Runtime OFF

Tenant: `00000000-0000-4000-8000-000000000099` (sem massa MSA)

| Campo | Valor |
|-------|-------|
| `binding_ratio` | `0` |
| `signal_readiness` | `NO_DATASET` |
| `promotion_applied` | `false` |
| `consolidation_applied` | `false` |
| `inactive` | `true` |
| `msa_cognitive_centers` | `[]` |
| `z22_reason` | `insufficient_binding_no_dataset` |

Frontend: `resolveMsaCockpitRuntime` → `null` · `shouldSuppressMsaPlaceholderWidgets` → `false`

---

## Cenário 2 — Runtime ON

Tenant piloto GF-012 · flags homologadas (sem bypass):

```
IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED=on
IMPETUS_MSA_RENDER_PROMOTION=controlled
IMPETUS_MSA_NATIVE_COCKPIT=on
IMPETUS_MSA_RUNTIME_FOUNDATION=true
```

| Campo | Valor |
|-------|-------|
| `binding_ratio` | `1.0` |
| `signal_readiness` | `ready` |
| `z22_gate` | `C_GATE_PASS` |
| `promotion_applied` | `true` |
| `consolidation_applied` | `true` |
| `inactive` | `false` |
| `cockpit_mode` | `msa_native` |
| `msa_cognitive_centers` | **6** |

---

## Cadeia Z homologada

```
Z.19  runMsaCockpitPilot
  ↓
Z.20  msa_signal_loader (observador passivo)
  ↓
Z.22  applyMsaControlledRenderPromotion  [gate ≥ 0.5]
  ↓
Z.23  applyMsaCockpitConsolidation      [gate ≥ 0.35 + Z.22]
  ↓
Foundation attach (preserva estado promovido)
  ↓
MsaNativeCockpitPromotion (Centro de Comando)
```

`phase_stack` observado: `…-MSA-Z.19-MSA-Z.22-MSA-Z.23`

**Sem** `force_msa_render` · **sem** `force_msa_consolidation` · **sem** recálculo de binding na Promotion.

---

## Centro de Comando

| Modo | Validação |
|------|-----------|
| OFF | Sem hubs · resolver `null` · placeholder `qualidade` não suprimido |
| ON | 6 hubs lazy · `MSA_HUB_REGISTRY` · suppress placeholder activo |

Hubs: `StudyGovernanceHub` · `GaugeManagementHub` · `VariableGrrHub` · `AttributeAgreementHub` · `CalibrationHub` · `CognitiveMsaHub`

---

## Regressão cruzada

9 runtimes homologados verificados no tenant referência — MSA permanece `inactive=true` em todos.

Coexistência quality + MSA no tenant piloto: `msa_active=true` · `msa_centers=6` · quality baseline preservado.

---

## Testes executados

```bash
npm run test:msa-runtime-homologation   # 11/11
npm run test:architecture-conformance   # 75/75 (incluído na homologação)
```

Suites regressão incluídas: Executive · Production · Maintenance · Quality · Logistics · PPAP · Environment · HR · SST · MSA promotion chain.

---

## Entregáveis

| Artefacto | Path |
|-----------|------|
| Evidência GF-013 | `backend/docs/evidence/GF-013-MSA-HOMOLOGATION.md` |
| Baseline LOCKED | `backend/docs/architecture/BASELINE-MSA-v1.0.md` |
| Testes | `backend/tests/msa/runMsaRuntimeHomologationTests.js` |

---

## Próximo passo

**INC-046** — registo oficial de `msa_native` no BASELINE-SYSTEM v1.3.

---

## Restrições respeitadas

GF-013 exclusivamente de **validação** — zero alterações a banco, migrations, Core Domain, Signal Loader, Promotion, thresholds, registries, runtime, CentroComando, APIs, CSS ou ARC-001.
