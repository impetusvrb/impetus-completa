# GF-011 — MSA Promotion & Command Center (Gate-Driven)

**Data:** 2026-07-17  
**Tipo:** implementação controlada  
**Pré-requisitos:** [GF-010-MSA-SIGNAL-LOADER.md](GF-010-MSA-SIGNAL-LOADER.md) · [GF-008-MSA-RUNTIME-FOUNDATION.md](GF-008-MSA-RUNTIME-FOUNDATION.md) · [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `MSA_PROMOTION_EXISTS` | **YES** |
| `MSA_CONSOLIDATION_EXISTS` | **YES** |
| `MSA_PROMOTION_GATE_DRIVEN` | **YES** |
| `MSA_BINDING_RECALCULATED` | **NO** |
| `MSA_RUNTIME_ACTIVE` | **ONLY_IF_GATE_PASS** |
| `NO_UI_REGRESSION` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** |

---

## Etapa 0 — Auditoria (tenant piloto)

Execução automática em `test:msa-promotion-chain`:

| Métrica | Valor observado (Cenário A) |
|---------|----------------------------|
| `MSA_BINDING_RATIO` | `0` |
| `MSA_BOUND_BLOCKS` | `[]` |
| `MSA_DATASET_STATUS` | `NO_DATASET` |
| `pilot_blocks` | 12 |
| `missing_blocks` | 12 |

**Classificação:** Cenário A — Promotion **OFF**, Consolidation **OFF**.

---

## Princípio

Promotion **passiva**, **gate-driven** e **determinística** — paridade PPAP GF-004:

- Consumir **apenas** `binding_ratio` / `engine_bridge` produzido pelo MSA Signal Loader (Z.19 pilot)
- **Proibido:** consultar BD na Promotion, recalcular binding, alterar thresholds, `force_*` bypass
- Payload actualizado: `msa_cognitive_runtime`, `msa_cognitive_centers` — **não** `msa_signal_loader`

---

## Implementação Z.22 — Render Promotion

| Ficheiro | Função |
|----------|--------|
| `msaRenderPromotionSupervisor.js` | Eligibility gate ≥ 0.5 (`phaseZ22FeatureFlags`) |
| `msaWidgetPromotionResolver.js` | Widgets promovidos a partir do shadow |
| `msaControlledRenderRuntime.js` | `applyMsaControlledRenderPromotion()` |

**Cenários:**

| Cenário | Condição | Resultado |
|---------|----------|-----------|
| A | `binding_ratio === 0` | `gate_scenario: A_NO_DATASET` · OFF |
| B | `0 < binding_ratio < 0.5` | `gate_scenario: B_BELOW_THRESHOLD` · OFF + `missing_blocks` |
| C | `binding_ratio ≥ 0.5` | `gate_scenario: C_GATE_PASS` · Z.22 ON |

---

## Implementação Z.23 — Cockpit Consolidation

| Ficheiro | Função |
|----------|--------|
| `msaConsolidationSupervisor.js` | Gate Z.23 ≥ 0.35 + Z.22 aplicado |
| `msaCenters.js` | 6 centers + `MSA_HUB_MOUNT_REGISTRY` |
| `msaCockpitConsolidator.js` | Monta centers a partir do shadow |
| `msaCockpitConsolidationRuntime.js` | `applyMsaCockpitConsolidation()` |

**Centers:**

- `msa_study_governance_ops` → StudyGovernanceHub
- `msa_gauge_management_ops` → GaugeManagementHub
- `msa_variable_grr_ops` → VariableGrrHub
- `msa_attribute_agreement_ops` → AttributeAgreementHub
- `msa_calibration_ops` → CalibrationHub
- `msa_cognitive_ops` → CognitiveMsaHub

---

## Frontend — Centro de Comando

| Ficheiro | Função |
|----------|--------|
| `msaNativeCockpitRegistry.js` | 6 hubs lazy + placeholder `qualidade` |
| `MsaNativeCockpitPromotion.jsx` | Montagem hubs quando `consolidation_applied` |
| `MsaHubShell.jsx` + hubs | Estado **Sem dados suficientes** honesto |
| `CentroComando.jsx` | Integração paridade PPAP (suppress + mount) |
| `specializedCockpitResolver.js` | `resolveMsaCockpitRuntime()` |

**Modo OFF:** não monta hubs · comportamento GF-008/010 preservado.  
**Modo ON:** substitui placeholder `qualidade` · monta 6 hubs MSA.

---

## Facade

`cognitiveRuntimeFacade.js`:

1. Z.19 pilot → `engine_bridge`
2. Z.22 `applyMsaControlledRenderPromotion`
3. Z.23 `applyMsaCockpitConsolidation` (ctx `msa_render_promoted`)
4. Foundation attach (preserva runtime promovido; não altera `msa_signal_loader`)

---

## Testes executados

```bash
npm run test:msa-promotion-chain
npm run test:msa-signal-loader
npm run test:msa-core-domain
npm run test:msa-runtime-foundation
npm run test:architecture-conformance
```

Regressão cross-domain: Executive · Production · Maintenance · Quality · Logistics · PPAP · Environment · HR · SST (cockpit foundation tests).

---

## Restrições respeitadas

- Core Domain / `msaCoreSemantics.js` — **inalterados**
- Signal Loader — **inalterado**
- Thresholds Z.22/Z.23 — **inalterados**
- APIs · CSS · BD — **inalterados**
- Sem IA · KPIs · gráficos nesta GF

---

## Referências

- [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md) §2.4
- [GF-004-PPAP-PROMOTION.md](GF-004-PPAP-PROMOTION.md) (modelo espelho)
- [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md)
